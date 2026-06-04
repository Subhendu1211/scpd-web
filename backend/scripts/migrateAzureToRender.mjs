#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(backendDir, "..");

for (const envPath of [
  path.resolve(backendDir, ".env.migration.local"),
  path.resolve(backendDir, ".env"),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

function toBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function q(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function tableRef(table) {
  return `public.${q(table)}`;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isTransientConnectionError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  if (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "57P01"].includes(code)) {
    return true;
  }
  return (
    message.includes("connection terminated unexpectedly") ||
    message.includes("server closed the connection unexpectedly") ||
    message.includes("connection reset") ||
    message.includes("connection ended unexpectedly") ||
    message.includes("timeout")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlaceholder(value) {
  return /REPLACE_WITH|CHANGE_ME|<[^>]+>/.test(String(value || ""));
}

function extractUrlInfo(connectionString) {
  try {
    const parsed = new URL(connectionString);
    return {
      host: parsed.hostname,
      port: toNumber(parsed.port, 5432),
      user: decodeURIComponent(parsed.username || ""),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    };
  } catch {
    return {};
  }
}

function buildConfig(name, primaryPrefix, fallbackPrefix) {
  const connectionTimeoutMillis = toNumber(process.env.MIGRATION_CONNECTION_TIMEOUT_MS, 15000);
  const url =
    process.env[`${primaryPrefix}_DATABASE_URL`] ||
    process.env[`${primaryPrefix}_URL`] ||
    process.env[`${fallbackPrefix}_DATABASE_URL`] ||
    "";

  if (url) {
    const info = extractUrlInfo(url);
    return {
      client: {
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis,
      },
      info: {
        ...info,
        usingConnectionString: true,
        ssl: true,
      },
      requiredValues: { url },
    };
  }

  const host = process.env[`${primaryPrefix}_HOST`] || process.env[`${fallbackPrefix}_HOST`];
  const port = toNumber(
    process.env[`${primaryPrefix}_PORT`] || process.env[`${fallbackPrefix}_PORT`],
    5432,
  );
  const user = process.env[`${primaryPrefix}_USER`] || process.env[`${fallbackPrefix}_USER`];
  const password =
    process.env[`${primaryPrefix}_PASS`] ||
    process.env[`${primaryPrefix}_PASSWORD`] ||
    process.env[`${fallbackPrefix}_PASS`] ||
    process.env[`${fallbackPrefix}_PASSWORD`];
  const database = process.env[`${primaryPrefix}_NAME`] || process.env[`${fallbackPrefix}_NAME`];
  const ssl = toBool(
    process.env[`${primaryPrefix}_SSL`] || process.env[`${fallbackPrefix}_SSL`],
    true,
  );

  return {
    client: {
      host,
      port,
      user,
      password,
      database,
      connectionTimeoutMillis,
      ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    info: {
      host,
      port,
      user,
      database,
      usingConnectionString: false,
      ssl,
    },
    requiredValues: { host, user, password, database },
  };
}

function assertUsableConfig(label, config) {
  for (const [key, value] of Object.entries(config.requiredValues)) {
    if (!value || isPlaceholder(value)) {
      throw new Error(`${label} is missing ${key}. Fill backend/.env.migration.local first.`);
    }
  }
}

function safeInfo(config) {
  return {
    host: config.info.host,
    port: config.info.port,
    user: config.info.user,
    database: config.info.database,
    usingConnectionString: Boolean(config.info.usingConnectionString),
    ssl: Boolean(config.info.ssl),
  };
}

function createClient(label, config) {
  const client = new Client(config.client);
  client.on("error", (error) => {
    console.warn(`${label} connection warning:`, error.message);
  });
  return client;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function getPublicTables(client) {
  const rows = await queryRows(
    client,
    `
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `,
  );
  return rows.map((row) => row.tablename);
}

async function relationExists(client, relname, relkinds = null) {
  const params = [relname];
  let kindFilter = "";
  if (relkinds?.length) {
    params.push(relkinds);
    kindFilter = 'AND c.relkind = ANY($2::"char"[])';
  }

  const rows = await queryRows(
    client,
    `
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = $1
        ${kindFilter}
      LIMIT 1;
    `,
    params,
  );
  return Boolean(rows.length);
}

async function typeExists(client, typeName) {
  const rows = await queryRows(
    client,
    `
      SELECT 1
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = $1
      LIMIT 1;
    `,
    [typeName],
  );
  return Boolean(rows.length);
}

async function syncEnumTypes(sourceClient, targetClient) {
  const rows = await queryRows(
    sourceClient,
    `
      SELECT
        t.typname AS type_name,
        json_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `,
  );

  for (const row of rows) {
    if (await typeExists(targetClient, row.type_name)) continue;

    const labelValues = Array.isArray(row.labels) ? row.labels : JSON.parse(row.labels);
    const labels = labelValues.map(sqlString).join(", ");
    await targetClient.query(`CREATE TYPE public.${q(row.type_name)} AS ENUM (${labels});`);
    console.log(`Created enum type ${row.type_name}.`);
  }
}

async function getTableColumns(client, table) {
  return queryRows(
    client,
    `
      SELECT
        a.attname AS column_name,
        a.attnum,
        a.attnotnull AS not_null,
        a.attidentity AS identity_kind,
        a.attgenerated AS generated_kind,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
        t.typname AS udt_name,
        pg_get_expr(ad.adbin, ad.adrelid) AS column_default
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
      LEFT JOIN pg_catalog.pg_attrdef ad
        ON ad.adrelid = a.attrelid
       AND ad.adnum = a.attnum
      WHERE n.nspname = 'public'
        AND c.relname = $1
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum;
    `,
    [table],
  );
}

function serialTypeFor(column) {
  const defaultSql = String(column.column_default || "");
  if (!defaultSql.startsWith("nextval(")) return null;
  if (column.udt_name === "int2") return "SMALLSERIAL";
  if (column.udt_name === "int4") return "SERIAL";
  if (column.udt_name === "int8") return "BIGSERIAL";
  return null;
}

function isJsonLike(udt) {
  return ["json", "jsonb"].includes(udt);
}

function isTextLike(udt) {
  return ["text", "varchar", "bpchar", "citext"].includes(udt);
}

function transformValueForTarget(value, sourceUdt, targetUdt) {
  if (value == null) return null;

  if (isJsonLike(targetUdt)) {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value));
      } catch {
        return JSON.stringify(value);
      }
    }
    return JSON.stringify(value);
  }

  if (isTextLike(targetUdt) && isJsonLike(sourceUdt) && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function columnDefinition(column, { addColumn = false } = {}) {
  const serialType = serialTypeFor(column);
  const parts = [q(column.column_name), serialType || column.formatted_type];

  if (!serialType) {
    if (column.identity_kind === "a") {
      parts.push("GENERATED ALWAYS AS IDENTITY");
    } else if (column.identity_kind === "d") {
      parts.push("GENERATED BY DEFAULT AS IDENTITY");
    } else if (column.generated_kind) {
      parts.push(`GENERATED ALWAYS AS (${column.column_default}) STORED`);
    } else if (column.column_default) {
      parts.push(`DEFAULT ${column.column_default}`);
    }
  }

  if (column.not_null && !addColumn) {
    parts.push("NOT NULL");
  }

  return parts.join(" ");
}

async function getTargetColumnNames(client, table) {
  const rows = await queryRows(
    client,
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1;
    `,
    [table],
  );
  return new Set(rows.map((row) => row.column_name));
}

async function ensureTableShape(sourceClient, targetClient, table) {
  const columns = await getTableColumns(sourceClient, table);
  if (!columns.length) return;

  const exists = await relationExists(targetClient, table, ["r", "p"]);

  if (!exists) {
    const ddl = `CREATE TABLE ${tableRef(table)} (\n  ${columns
      .map((column) => columnDefinition(column))
      .join(",\n  ")}\n);`;
    await targetClient.query(ddl);
    console.log(`Created missing table ${table}.`);
    return;
  }

  const targetColumns = await getTargetColumnNames(targetClient, table);
  for (const column of columns) {
    if (targetColumns.has(column.column_name)) continue;
    const ddl = `ALTER TABLE ${tableRef(table)} ADD COLUMN ${columnDefinition(column, {
      addColumn: true,
    })};`;
    await targetClient.query(ddl);
    console.log(`Added missing column ${table}.${column.column_name}.`);
  }
}

async function getConstraints(client, table, types) {
  return queryRows(
    client,
    `
      SELECT conname, contype, pg_get_constraintdef(oid, true) AS definition
      FROM pg_catalog.pg_constraint
      WHERE conrelid = (
          SELECT c.oid
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = $1
          LIMIT 1
        )
        AND contype = ANY($2::"char"[])
      ORDER BY
        CASE contype
          WHEN 'p' THEN 1
          WHEN 'u' THEN 2
          WHEN 'c' THEN 3
          WHEN 'f' THEN 4
          ELSE 5
        END,
        conname;
    `,
    [table, types],
  );
}

async function getTargetConstraintNames(client, table) {
  const rows = await queryRows(
    client,
    `
      SELECT conname
      FROM pg_catalog.pg_constraint
      WHERE conrelid = (
          SELECT c.oid
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = $1
          LIMIT 1
        );
    `,
    [table],
  );
  return new Set(rows.map((row) => row.conname));
}

async function syncConstraints(sourceClient, targetClient, table, types) {
  const sourceConstraints = await getConstraints(sourceClient, table, types);
  if (!sourceConstraints.length) return;

  const targetNames = await getTargetConstraintNames(targetClient, table);
  for (const constraint of sourceConstraints) {
    if (targetNames.has(constraint.conname)) continue;
    const sql = `ALTER TABLE ${tableRef(table)} ADD CONSTRAINT ${q(
      constraint.conname,
    )} ${constraint.definition};`;
    try {
      await targetClient.query(sql);
      console.log(`Added constraint ${constraint.conname} on ${table}.`);
    } catch (error) {
      console.warn(`Could not add constraint ${constraint.conname} on ${table}: ${error.message}`);
    }
  }
}

async function syncIndexes(sourceClient, targetClient, table) {
  const rows = await queryRows(
    sourceClient,
    `
      SELECT indexname, indexdef
      FROM pg_catalog.pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
      ORDER BY indexname;
    `,
    [table],
  );

  for (const row of rows) {
    if (await relationExists(targetClient, row.indexname, ["i", "I"])) continue;

    const ddl = row.indexdef.replace(
      /^CREATE (UNIQUE )?INDEX /i,
      (match, unique = "") => `CREATE ${unique || ""}INDEX IF NOT EXISTS `,
    );

    try {
      await targetClient.query(ddl);
      console.log(`Created index ${row.indexname}.`);
    } catch (error) {
      console.warn(`Could not create index ${row.indexname}: ${error.message}`);
    }
  }
}

async function getForeignKeyEdges(client, tables) {
  if (!tables.length) return [];
  const rows = await queryRows(
    client,
    `
      SELECT
        source.relname AS child_table,
        target.relname AS parent_table
      FROM pg_constraint c
      JOIN pg_class source ON source.oid = c.conrelid
      JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
      JOIN pg_class target ON target.oid = c.confrelid
      JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
      WHERE c.contype = 'f'
        AND source_ns.nspname = 'public'
        AND target_ns.nspname = 'public';
    `,
  );
  const tableSet = new Set(tables);
  return rows
    .filter(
      (row) =>
        tableSet.has(row.child_table) &&
        tableSet.has(row.parent_table) &&
        row.child_table !== row.parent_table,
    )
    .map((row) => ({ parent: row.parent_table, child: row.child_table }));
}

async function makeForeignKeysDeferrable(client, tables) {
  if (!tables.length) return;

  const rows = await queryRows(
    client,
    `
      SELECT
        source.relname AS table_name,
        c.conname AS constraint_name
      FROM pg_constraint c
      JOIN pg_class source ON source.oid = c.conrelid
      JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
      WHERE c.contype = 'f'
        AND source_ns.nspname = 'public'
        AND source.relname = ANY($1::text[])
        AND NOT c.condeferrable
      ORDER BY source.relname, c.conname;
    `,
    [tables],
  );

  for (const row of rows) {
    await client.query(
      `ALTER TABLE ${tableRef(row.table_name)} ALTER CONSTRAINT ${q(
        row.constraint_name,
      )} DEFERRABLE INITIALLY DEFERRED;`,
    );
  }

  if (rows.length) {
    console.log(`Made ${rows.length} existing Render foreign keys deferrable for bulk copy.`);
  }
}

async function getForeignKeyConstraints(client, tables) {
  if (!tables.length) return [];

  return queryRows(
    client,
    `
      SELECT
        source.relname AS table_name,
        c.conname AS constraint_name,
        pg_get_constraintdef(c.oid, true) AS definition
      FROM pg_constraint c
      JOIN pg_class source ON source.oid = c.conrelid
      JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
      WHERE c.contype = 'f'
        AND source_ns.nspname = 'public'
        AND source.relname = ANY($1::text[])
      ORDER BY source.relname, c.conname;
    `,
    [tables],
  );
}

async function dropForeignKeys(client, tables) {
  const constraints = await getForeignKeyConstraints(client, tables);

  for (const constraint of constraints) {
    await client.query(
      `ALTER TABLE ${tableRef(constraint.table_name)} DROP CONSTRAINT ${q(
        constraint.constraint_name,
      )};`,
    );
  }

  if (constraints.length) {
    console.log(`Dropped ${constraints.length} Render foreign keys before bulk copy.`);
  }

  return constraints;
}

async function restoreForeignKeys(client, constraints) {
  for (const constraint of constraints) {
    const targetNames = await getTargetConstraintNames(client, constraint.table_name);
    if (targetNames.has(constraint.constraint_name)) continue;

    try {
      await client.query(
        `ALTER TABLE ${tableRef(constraint.table_name)} ADD CONSTRAINT ${q(
          constraint.constraint_name,
        )} ${constraint.definition};`,
      );
      console.log(`Restored foreign key ${constraint.constraint_name} on ${constraint.table_name}.`);
    } catch (error) {
      console.warn(
        `Could not restore foreign key ${constraint.constraint_name} on ${constraint.table_name}: ${error.message}`,
      );
    }
  }
}

function topoSortTables(tables, edges) {
  const inDegree = new Map(tables.map((table) => [table, 0]));
  const children = new Map(tables.map((table) => [table, []]));

  for (const { parent, child } of edges) {
    if (!inDegree.has(child) || !children.has(parent)) continue;
    inDegree.set(child, inDegree.get(child) + 1);
    children.get(parent).push(child);
  }

  const queue = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([table]) => table)
    .sort();
  const ordered = [];

  while (queue.length) {
    const table = queue.shift();
    ordered.push(table);

    for (const child of children.get(table)) {
      const nextDegree = inDegree.get(child) - 1;
      inDegree.set(child, nextDegree);
      if (nextDegree === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  if (ordered.length === tables.length) return ordered;

  const seen = new Set(ordered);
  return ordered.concat(tables.filter((table) => !seen.has(table)).sort());
}

async function getRowCount(client, table) {
  const rows = await queryRows(client, `SELECT COUNT(*)::bigint AS count FROM ${tableRef(table)};`);
  return Number(rows[0]?.count || 0);
}

async function copyTableRows(sourceClient, targetClient, table) {
  const deferByteaColumns = toBool(process.env.MIGRATION_DEFER_BYTEA_COLUMNS, false);
  const sourceColumns = (await getTableColumns(sourceClient, table)).filter(
    (column) => !column.generated_kind,
  );
  const targetByName = new Map(
    (await getTableColumns(targetClient, table)).map((column) => [column.column_name, column]),
  );
  const matchingColumns = sourceColumns
    .map((sourceColumn) => ({
      ...sourceColumn,
      target_udt: targetByName.get(sourceColumn.column_name)?.udt_name || sourceColumn.udt_name,
    }))
    .filter((column) => targetByName.has(column.column_name));
  const columns = matchingColumns.filter(
    (column) =>
      !deferByteaColumns || (column.udt_name !== "bytea" && column.target_udt !== "bytea"),
  );
  const deferredColumns = matchingColumns.length - columns.length;

  if (deferredColumns) {
    console.log(`Deferred ${deferredColumns} bytea column(s) -> ${table}`);
  }

  if (!columns.length) return 0;

  const columnNames = columns.map((column) => column.column_name);
  const colList = columnNames.map(q).join(", ");
  const hasAlwaysIdentity = columns.some((column) => column.identity_kind === "a");
  const override = hasAlwaysIdentity ? " OVERRIDING SYSTEM VALUE" : "";
  const hasBinaryColumn = columns.some(
    (column) => column.udt_name === "bytea" || column.target_udt === "bytea",
  );
  const fetchBatchSize = hasBinaryColumn ? 8 : 1000;
  const insertBatchSize = hasBinaryColumn ? 1 : 200;
  let copied = 0;

  for (let offset = 0; ; offset += fetchBatchSize) {
    const sourceRows = await queryRows(
      sourceClient,
      `SELECT ${colList} FROM ${tableRef(table)} LIMIT $1 OFFSET $2;`,
      [fetchBatchSize, offset],
    );
    if (!sourceRows.length) break;

    for (let start = 0; start < sourceRows.length; start += insertBatchSize) {
      const batch = sourceRows.slice(start, start + insertBatchSize);
      const values = [];
      const placeholders = batch.map((row, rowIndex) => {
        const base = rowIndex * columnNames.length;
        const rowPlaceholders = columnNames.map((columnName, columnIndex) => {
          const column = columns[columnIndex];
          values.push(transformValueForTarget(row[columnName], column.udt_name, column.target_udt));
          return `$${base + columnIndex + 1}`;
        });
        return `(${rowPlaceholders.join(", ")})`;
      });

      await targetClient.query(
        `INSERT INTO ${tableRef(table)} (${colList})${override} VALUES ${placeholders.join(", ")};`,
        values,
      );
      copied += batch.length;
    }
  }

  return copied;
}

async function resetSequences(client, table) {
  const rows = await queryRows(
    client,
    `
      SELECT
        a.attname AS column_name,
        pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relname = $1
        AND a.attnum > 0
        AND NOT a.attisdropped;
    `,
    [table],
  );

  for (const row of rows) {
    if (!row.seq_name) continue;
    await client.query(
      `
        SELECT setval(
          $1::regclass,
          COALESCE((SELECT MAX(${q(row.column_name)}) FROM ${tableRef(table)}), 1),
          (SELECT MAX(${q(row.column_name)}) IS NOT NULL FROM ${tableRef(table)})
        );
      `,
      [row.seq_name],
    );
  }
}

function resolveInitSqlPath() {
  const candidates = [
    path.resolve(repoDir, "infra/db/init.sql"),
    path.resolve(backendDir, "infra/db/init.sql"),
    path.resolve(backendDir, "db/init.sql"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function bootstrapTargetSchemaIfEmpty(targetClient) {
  const tables = await getPublicTables(targetClient);
  if (tables.length) return;

  const initSqlPath = resolveInitSqlPath();
  if (!initSqlPath) {
    console.warn("Target has no public tables and init.sql was not found.");
    return;
  }

  await targetClient.query(fs.readFileSync(initSqlPath, "utf8"));
  console.log(`Bootstrapped target schema from ${initSqlPath}.`);
}

async function main() {
  const sourceConfig = buildConfig("Azure source", "AZURE_DB", "SRC_DB");
  const targetConfig = buildConfig("Render target", "RENDER_DB", "DB");
  assertUsableConfig("Azure source", sourceConfig);
  assertUsableConfig("Render target", targetConfig);

  const validateOnly = toBool(process.env.MIGRATION_VALIDATE_ONLY, true);
  const confirm = String(process.env.MIGRATION_CONFIRM || "");
  const maxTableRetries = toNumber(process.env.MIGRATION_TABLE_RETRIES, 4);
  const requestedTables = String(process.env.MIGRATION_TABLES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  console.log("Azure source:", safeInfo(sourceConfig));
  console.log("Render target:", safeInfo(targetConfig));

  if (!validateOnly && confirm !== "AZURE_TO_RENDER_FULL_REFRESH") {
    throw new Error(
      "Refusing to modify Render. Set MIGRATION_CONFIRM=AZURE_TO_RENDER_FULL_REFRESH to run the copy.",
    );
  }

  let sourceClient = createClient("Azure source", sourceConfig);
  let targetClient = createClient("Render target", targetConfig);
  let droppedTargetForeignKeys = [];

  async function reconnect(reason) {
    const maxReconnectRetries = toNumber(process.env.MIGRATION_RECONNECT_RETRIES, 3);

    for (let attempt = 1; ; attempt += 1) {
      await Promise.allSettled([sourceClient.end(), targetClient.end()]);
      sourceClient = createClient("Azure source", sourceConfig);
      targetClient = createClient("Render target", targetConfig);

      try {
        await sourceClient.connect();
        await targetClient.connect();
        console.log(`Reconnected databases for ${reason}.`);
        return;
      } catch (error) {
        await Promise.allSettled([sourceClient.end(), targetClient.end()]);
        if (!isTransientConnectionError(error) || attempt >= maxReconnectRetries) {
          throw error;
        }
        console.warn(
          `Reconnect failed for ${reason} (attempt ${attempt}/${maxReconnectRetries}). Retrying...`,
        );
        await sleep(1000 * attempt);
      }
    }
  }

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log("Connected to Azure source and Render target.");

    const sourceTables = await getPublicTables(sourceClient);
    console.log(`Azure public tables: ${sourceTables.length}`);

    if (!sourceTables.length) {
      throw new Error("Azure source has no public tables to migrate.");
    }

    const tablesToMigrate = requestedTables.length
      ? sourceTables.filter((table) => requestedTables.includes(table))
      : sourceTables;
    const missingRequestedTables = requestedTables.filter(
      (table) => !sourceTables.includes(table),
    );
    if (missingRequestedTables.length) {
      throw new Error(
        `Requested MIGRATION_TABLES not found in Azure source: ${missingRequestedTables.join(", ")}`,
      );
    }
    if (!tablesToMigrate.length) {
      throw new Error("No source tables selected for migration.");
    }

    if (requestedTables.length) {
      console.log(`Scoped migration tables: ${tablesToMigrate.join(", ")}`);
    }

    const sourceCounts = [];
    for (const table of tablesToMigrate) {
      sourceCounts.push({ table, rows: await getRowCount(sourceClient, table) });
    }

    const targetTablesBefore = await getPublicTables(targetClient);
    const missingOnTarget = tablesToMigrate.filter((table) => !targetTablesBefore.includes(table));

    console.log(`Render public tables before migration: ${targetTablesBefore.length}`);
    console.log(`Tables to create on Render: ${missingOnTarget.length}`);
    console.log(`Rows to copy: ${sourceCounts.reduce((sum, item) => sum + item.rows, 0)}`);

    if (validateOnly) {
      console.log("Validation mode enabled. No Render data was changed.");
      for (const item of sourceCounts) {
        console.log(`  ${item.table}: ${item.rows} rows`);
      }
      return;
    }

    await bootstrapTargetSchemaIfEmpty(targetClient);
    await syncEnumTypes(sourceClient, targetClient);

    for (const table of tablesToMigrate) {
      await ensureTableShape(sourceClient, targetClient, table);
      await syncConstraints(sourceClient, targetClient, table, ["p", "u", "c"]);
    }

    droppedTargetForeignKeys = await dropForeignKeys(targetClient, tablesToMigrate);

    const truncateSql = `TRUNCATE TABLE ${tablesToMigrate.map(tableRef).join(
      ", ",
    )} RESTART IDENTITY CASCADE;`;
    await targetClient.query(truncateSql);
    console.log(`Truncated ${tablesToMigrate.length} Render tables.`);

    await reconnect("bulk copy");

    const fkEdges = [
      ...(await getForeignKeyEdges(sourceClient, tablesToMigrate)),
    ];
    const orderedTables = topoSortTables(tablesToMigrate, fkEdges);
    const stats = [];

    for (let idx = 0; idx < orderedTables.length; idx += 1) {
      const table = orderedTables[idx];
      let attempts = 0;
      // Retry a table copy when cloud databases drop long-lived connections.
      while (true) {
        try {
          const copied = await copyTableRows(sourceClient, targetClient, table);
          await resetSequences(targetClient, table);
          stats.push({ table, copied });
          console.log(`Copied ${copied} rows -> ${table}`);
          break;
        } catch (error) {
          attempts += 1;
          const retryable = isTransientConnectionError(error) && attempts <= maxTableRetries;
          if (!retryable) {
            throw new Error(`Copy failed for ${table}: ${error.message}`);
          }

          console.warn(
            `Transient copy failure on ${table} (attempt ${attempts}/${maxTableRetries}). Reconnecting and retrying...`,
          );
          await reconnect(`retry ${table}`);
          await targetClient.query(`TRUNCATE TABLE ${tableRef(table)} RESTART IDENTITY CASCADE;`);
        }
      }

      if ((idx + 1) % 10 === 0 && idx + 1 < orderedTables.length) {
        await reconnect(`bulk copy table ${idx + 1}/${orderedTables.length}`);
      }
    }

    await reconnect("constraint and index sync");

    for (const table of tablesToMigrate) {
      await syncConstraints(sourceClient, targetClient, table, ["f"]);
    }
    await restoreForeignKeys(targetClient, droppedTargetForeignKeys);

    for (const table of tablesToMigrate) {
      await syncIndexes(sourceClient, targetClient, table);
    }

    const totalCopied = stats.reduce((sum, item) => sum + item.copied, 0);
    console.log("Azure -> Render migration completed.");
    console.log(`Tables copied: ${stats.length}`);
    console.log(`Rows copied: ${totalCopied}`);
  } catch (error) {
    if (droppedTargetForeignKeys.length) {
      try {
        await restoreForeignKeys(targetClient, droppedTargetForeignKeys);
      } catch {
        // A rerun will attempt to restore/sync constraints again.
      }
    }
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([sourceClient.end(), targetClient.end()]);
  }
}

main();
