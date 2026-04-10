#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
}

function q(identifier) {
  return `"${String(identifier).replace(/"/g, "\"\"")}"`;
}

function tableRef(schema, table) {
  return `${q(schema)}.${q(table)}`;
}

function buildConfig(prefix, defaults = {}) {
  const host = process.env[`${prefix}_HOST`] ?? defaults.host;
  const port = toNumber(process.env[`${prefix}_PORT`], defaults.port);
  const user = process.env[`${prefix}_USER`] ?? defaults.user;
  const password = process.env[`${prefix}_PASS`] ?? defaults.password;
  const database = process.env[`${prefix}_NAME`] ?? defaults.database;
  const sslEnabled = toBool(process.env[`${prefix}_SSL`], defaults.sslEnabled);

  const config = { host, port, user, password, database };
  if (sslEnabled) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

async function getPublicTables(client) {
  const { rows } = await client.query(
    `
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `
  );
  return rows.map((r) => r.tablename);
}

async function getTableColumns(client, table) {
  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `,
    [table]
  );
  return rows.map((r) => r.column_name);
}

async function getForeignKeyEdges(client, candidateTables) {
  if (!candidateTables.length) return [];
  const { rows } = await client.query(
    `
      SELECT
        tc.table_name AS child_table,
        ccu.table_name AS parent_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_schema = 'public';
    `
  );

  const tableSet = new Set(candidateTables);
  return rows
    .filter((r) => tableSet.has(r.child_table) && tableSet.has(r.parent_table))
    .map((r) => ({ parent: r.parent_table, child: r.child_table }));
}

function topoSortTables(tables, edges) {
  const inDegree = new Map();
  const children = new Map();
  for (const t of tables) {
    inDegree.set(t, 0);
    children.set(t, []);
  }
  for (const { parent, child } of edges) {
    if (!children.has(parent) || !inDegree.has(child)) continue;
    children.get(parent).push(child);
    inDegree.set(child, inDegree.get(child) + 1);
  }

  const queue = [];
  for (const [table, degree] of inDegree) {
    if (degree === 0) queue.push(table);
  }
  queue.sort();

  const ordered = [];
  while (queue.length) {
    const table = queue.shift();
    ordered.push(table);
    for (const child of children.get(table)) {
      const next = inDegree.get(child) - 1;
      inDegree.set(child, next);
      if (next === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  if (ordered.length === tables.length) return ordered;
  const visited = new Set(ordered);
  const remaining = tables.filter((t) => !visited.has(t)).sort();
  return ordered.concat(remaining);
}

async function resetSequences(targetClient, table) {
  const { rows } = await targetClient.query(
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
    [table]
  );

  for (const row of rows) {
    if (!row.seq_name) continue;
    const sql = `
      SELECT setval(
        $1::regclass,
        COALESCE((SELECT MAX(${q(row.column_name)}) FROM ${tableRef("public", table)}), 1),
        (SELECT MAX(${q(row.column_name)}) IS NOT NULL FROM ${tableRef("public", table)})
      );
    `;
    await targetClient.query(sql, [row.seq_name]);
  }
}

async function copyTableData(sourceClient, targetClient, table, commonColumns) {
  if (!commonColumns.length) return { inserted: 0 };

  const colList = commonColumns.map(q).join(", ");
  const sourceSql = `SELECT ${colList} FROM ${tableRef("public", table)};`;
  const sourceRes = await sourceClient.query(sourceSql);
  const rows = sourceRes.rows;
  if (!rows.length) return { inserted: 0 };

  const batchSize = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIdx) => {
      const base = rowIdx * commonColumns.length;
      const inner = commonColumns.map((col, colIdx) => {
        values.push(row[col]);
        return `$${base + colIdx + 1}`;
      });
      return `(${inner.join(", ")})`;
    });

    const insertSql = `
      INSERT INTO ${tableRef("public", table)} (${colList})
      VALUES ${placeholders.join(", ")};
    `;
    await targetClient.query(insertSql, values);
    inserted += batch.length;
  }

  return { inserted };
}

async function migrate() {
  const sourceConfig = buildConfig("SRC_DB", {
    host: "localhost",
    port: 55400,
    user: "postgres",
    password: "postgres",
    database: "scpd_cms",
    sslEnabled: false,
  });

  const targetConfig = buildConfig("DB", {
    host: process.env.PGHOST || "localhost",
    port: toNumber(process.env.PGPORT, 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "postgres",
    sslEnabled: toBool(process.env.DB_SSL || process.env.PGSSLMODE === "require", false),
  });

  const validateOnly = toBool(process.env.MIGRATION_VALIDATE_ONLY, false);

  console.log("Source DB:", {
    host: sourceConfig.host,
    port: sourceConfig.port,
    user: sourceConfig.user,
    database: sourceConfig.database,
  });
  console.log("Target DB:", {
    host: targetConfig.host,
    port: targetConfig.port,
    user: targetConfig.user,
    database: targetConfig.database,
  });

  const sourceClient = new Client(sourceConfig);
  const targetClient = new Client(targetConfig);

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log("Connected to source and target databases.");

    const sourceTables = await getPublicTables(sourceClient);
    const targetTables = await getPublicTables(targetClient);
    console.log(`Source public tables: ${sourceTables.length}`);
    console.log(`Target public tables: ${targetTables.length}`);

    if (validateOnly) {
      console.log("Validation mode enabled. No changes were made.");
      return;
    }

    const targetSet = new Set(targetTables);
    const commonTables = sourceTables.filter((t) => targetSet.has(t));
    const missingOnTarget = sourceTables.filter((t) => !targetSet.has(t));

    if (!commonTables.length) {
      throw new Error("No common tables found between source and target.");
    }

    if (missingOnTarget.length) {
      console.warn(
        `Warning: ${missingOnTarget.length} source tables are missing on target and will be skipped.`
      );
      for (const t of missingOnTarget) {
        console.warn(`  - ${t}`);
      }
    }

    const fkEdges = await getForeignKeyEdges(targetClient, commonTables);
    const orderedTables = topoSortTables(commonTables, fkEdges);

    await targetClient.query("BEGIN");
    await targetClient.query("SET CONSTRAINTS ALL DEFERRED");

    if (targetTables.length) {
      const truncateSql = `TRUNCATE TABLE ${targetTables
        .map((t) => tableRef("public", t))
        .join(", ")} RESTART IDENTITY CASCADE;`;
      await targetClient.query(truncateSql);
      console.log(`Truncated ${targetTables.length} target tables.`);
    }

    const stats = [];
    for (const table of orderedTables) {
      const sourceCols = await getTableColumns(sourceClient, table);
      const targetCols = await getTableColumns(targetClient, table);
      const targetColSet = new Set(targetCols);
      const commonCols = sourceCols.filter((c) => targetColSet.has(c));

      if (!commonCols.length) {
        console.warn(`Skipping ${table}: no common columns found.`);
        stats.push({ table, inserted: 0, skipped: true });
        continue;
      }

      const { inserted } = await copyTableData(sourceClient, targetClient, table, commonCols);
      await resetSequences(targetClient, table);
      stats.push({ table, inserted, skipped: false });
      console.log(`Copied ${inserted} rows -> ${table}`);
    }

    await targetClient.query("COMMIT");

    const totalRows = stats.reduce((sum, s) => sum + s.inserted, 0);
    console.log("Migration completed.");
    console.log(`Tables processed: ${stats.length}`);
    console.log(`Total rows copied: ${totalRows}`);
  } catch (error) {
    try {
      await targetClient.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([sourceClient.end(), targetClient.end()]);
  }
}

migrate();
