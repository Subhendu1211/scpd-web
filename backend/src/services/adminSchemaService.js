import { pool } from "../models/db.js";
import fs from "fs";
import path from "path";

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_COLUMNS = 50;
const REGISTRY_TABLE = "cms_dynamic_tables";
const PUBLIC_SCHEMA = "public";
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "media");

function inferMediaMimeType(targetName, providedMimeType) {
  const mime = String(providedMimeType || "").trim().toLowerCase();
  if (mime) return mime;

  const ext = path.extname(targetName).toLowerCase();
  const byExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return byExt[ext] || "application/octet-stream";
}

function inferMediaCategory(mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  // Keep documents in an allowed category that still passes existing DB constraint.
  return "newspaper";
}

function quoteIdent(identifier) {
  // Identifiers are validated by IDENTIFIER_REGEX before reaching SQL.
  // This is still defensive and prevents accidental breakage.
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function qualifyTable(schemaName, tableName) {
  return `${quoteIdent(schemaName)}.${quoteIdent(tableName)}`;
}

async function getTableOid(client, schemaName, tableName) {
  const { rows } = await client.query(
    `SELECT c.oid AS oid
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relname = $2
        AND c.relkind IN ('r', 'p')
      LIMIT 1`,
    [schemaName, tableName]
  );

  return rows[0]?.oid ?? null;
}

const TYPE_BUILDERS = {
  text: () => "TEXT",
  doc: () => "TEXT",
  varchar: (column) => {
    const length = Number.isInteger(column.length) ? column.length : Number(column.length);
    if (!Number.isInteger(length) || length < 1 || length > 255) {
      throw badRequest("varchar length must be an integer between 1 and 255");
    }
    return `VARCHAR(${length})`;
  },
  integer: () => "INTEGER",
  bigint: () => "BIGINT",
  boolean: () => "BOOLEAN",
  date: () => "DATE",
  timestamp: () => "TIMESTAMP",
  timestamptz: () => "TIMESTAMPTZ",
  jsonb: () => "JSONB",
  uuid: () => "UUID",
  numeric: (column) => {
    if (column.precision === undefined && column.scale === undefined) {
      return "NUMERIC";
    }
    const precision = Number.isInteger(column.precision) ? column.precision : Number(column.precision);
    const scale = Number.isInteger(column.scale) ? column.scale : Number(column.scale ?? 0);
    if (!Number.isInteger(precision) || precision < 1 || precision > 38) {
      throw badRequest("numeric precision must be an integer between 1 and 38");
    }
    if (!Number.isInteger(scale) || scale < 0 || scale > precision) {
      throw badRequest("numeric scale must be an integer between 0 and precision");
    }
    return `NUMERIC(${precision}, ${scale})`;
  }
};

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeColor(value, fieldLabel) {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return null;
  }
  const str = `${value}`.trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (!hex.test(str)) {
    throw badRequest(`${fieldLabel} must be a hex color like #1b6dd1 or #fff`);
  }
  return str.toLowerCase();
}

function normalizeDefault(typeKey, defaultValue) {
  if (defaultValue === undefined || defaultValue === null || `${defaultValue}`.trim() === "") {
    return null;
  }
  const raw = `${defaultValue}`.trim();
  const lower = raw.toLowerCase();

  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return raw;
  }

  if (lower === "true" || lower === "false") {
    return lower;
  }

  if ((typeKey === "timestamp" || typeKey === "timestamptz") && (lower === "now()" || lower === "current_timestamp")) {
    return lower;
  }

  throw badRequest("Default value must be a number, boolean, or now()/current_timestamp for timestamps");
}

function normalizeColumn(column) {
  const name = typeof column?.name === "string" ? column.name.trim() : "";
  if (!IDENTIFIER_REGEX.test(name)) {
    throw badRequest(`Invalid column name: ${name || "<empty>"}`);
  }

  const typeKey = typeof column?.type === "string" ? column.type.trim().toLowerCase() : "";
  const typeBuilder = TYPE_BUILDERS[typeKey];
  if (!typeBuilder) {
    throw badRequest(`Unsupported column type: ${typeKey}`);
  }

  const sqlType = typeBuilder(column);
  const isPrimaryKey = column.isPrimaryKey === true;
  const nullable = column.nullable === true && !isPrimaryKey;
  const defaultValue = normalizeDefault(typeKey, column.defaultValue);

  return {
    name,
    type: typeKey,
    sqlType,
    isPrimaryKey,
    nullable,
    defaultValue
  };
}

async function ensureRegistryTable(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${REGISTRY_TABLE} (
      table_name TEXT PRIMARY KEY,
      display_name TEXT,
      expose_frontend BOOLEAN DEFAULT FALSE,
      header_bg_color TEXT,
      header_text_color TEXT,
      body_text_color TEXT,
      columns JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  );
}

async function ensurePageTableMapping(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_page_tables (
      menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
      table_name TEXT NOT NULL
    );
  `);
}

async function upsertRegistry(client, tableName, columns, exposeFrontend = false) {
  await ensureRegistryTable(client);
  await client.query(
    `INSERT INTO ${REGISTRY_TABLE} (table_name, display_name, expose_frontend, columns)
     VALUES ($1, $1, $3, $2)
     ON CONFLICT (table_name)
     DO UPDATE SET
       columns = EXCLUDED.columns,
       expose_frontend = ${REGISTRY_TABLE}.expose_frontend OR EXCLUDED.expose_frontend;`,
    [tableName, JSON.stringify(columns), exposeFrontend === true]
  );
}

async function recordTable(client, tableName, columns) {
  await ensureRegistryTable(client);
  await client.query(
    `INSERT INTO ${REGISTRY_TABLE} (table_name, display_name, expose_frontend, columns)
     VALUES ($1, $1, FALSE, $2)
     ON CONFLICT (table_name)
     DO UPDATE SET columns = EXCLUDED.columns;`,
    [tableName, JSON.stringify(columns)]
  );
}

function normalizeTableName(tableName) {
  const normalizedTableName = typeof tableName === "string" ? tableName.trim() : "";
  if (!IDENTIFIER_REGEX.test(normalizedTableName)) {
    throw badRequest("Table name must contain letters, numbers, or underscores and start with a letter");
  }
  return normalizedTableName;
}

function mapDbTypeToColumn(row, isPrimaryKey) {
  const dataType = (row.data_type || "").toLowerCase();
  const udtName = (row.udt_name || "").toLowerCase();
  const nullable = row.is_nullable === "YES";
  const defaultValue = row.column_default || null;

  const base = {
    name: row.column_name,
    nullable,
    isPrimaryKey,
    defaultValue,
    sqlType: row.data_type,
    type: dataType
  };

  if (dataType === "character varying") {
    const length = row.character_maximum_length;
    return { ...base, type: "varchar", sqlType: length ? `VARCHAR(${length})` : "VARCHAR", length };
  }

  if (dataType === "text") return { ...base, type: "text", sqlType: "TEXT" };
  if (dataType === "integer") return { ...base, type: "integer", sqlType: "INTEGER" };
  if (dataType === "bigint") return { ...base, type: "bigint", sqlType: "BIGINT" };
  if (dataType === "boolean") return { ...base, type: "boolean", sqlType: "BOOLEAN" };
  if (dataType === "uuid") return { ...base, type: "uuid", sqlType: "UUID" };
  if (dataType === "jsonb") return { ...base, type: "jsonb", sqlType: "JSONB" };
  if (dataType === "date") return { ...base, type: "date", sqlType: "DATE" };
  if (dataType === "timestamp with time zone") return { ...base, type: "timestamptz", sqlType: "TIMESTAMPTZ" };
  if (dataType === "timestamp without time zone") return { ...base, type: "timestamp", sqlType: "TIMESTAMP" };
  if (dataType === "numeric") {
    const precision = row.numeric_precision;
    const scale = row.numeric_scale;
    const parts = [];
    if (precision != null) parts.push(precision);
    if (scale != null) parts.push(scale);
    const typeSql = parts.length ? `NUMERIC(${parts.join(", ")})` : "NUMERIC";
    return { ...base, type: "numeric", sqlType: typeSql, precision, scale };
  }

  // Fallback: use udt_name or data_type
  return { ...base, type: udtName || dataType || "text", sqlType: row.data_type || udtName || "text" };
}

function mergeColumns(existing = [], updated) {
  const map = new Map(existing.map((c) => [c.name, c]));
  map.set(updated.name, updated);
  return Array.from(map.values());
}

async function introspectTable(client, tableName) {
  const oid = await getTableOid(client, PUBLIC_SCHEMA, tableName);
  if (!oid) {
    throw badRequest(`Table "${tableName}" does not exist in schema ${PUBLIC_SCHEMA}`);
  }

  const { rows: pkRows } = await client.query(
    `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::oid AND i.indisprimary`,
    [oid]
  );
  const pkSet = new Set(pkRows.map((r) => r.column_name));

  const { rows } = await client.query(
    `SELECT column_name,
            is_nullable,
            data_type,
            udt_name,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            column_default
       FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position`,
    [PUBLIC_SCHEMA, tableName]
  );

  if (!rows.length) {
    throw badRequest(`Table "${tableName}" does not exist in schema ${PUBLIC_SCHEMA}`);
  }

  const columns = rows.map((row) => mapDbTypeToColumn(row, pkSet.has(row.column_name)));

  return {
    tableName,
    displayName: tableName,
    exposeFrontend: false,
    columns
  };
}

export async function createDynamicTable({ tableName, columns }) {
  const normalizedTableName = normalizeTableName(tableName);

  if (!Array.isArray(columns) || columns.length === 0) {
    throw badRequest("At least one column definition is required");
  }

  if (columns.length > MAX_COLUMNS) {
    throw badRequest(`A maximum of ${MAX_COLUMNS} columns is allowed`);
  }

  const normalizedColumns = columns.map(normalizeColumn);

  const seenNames = new Set();
  normalizedColumns.forEach((col) => {
    const key = col.name.toLowerCase();
    if (seenNames.has(key)) {
      throw badRequest(`Duplicate column name: ${col.name}`);
    }
    seenNames.add(key);
  });

  const primaryColumns = normalizedColumns.filter((c) => c.isPrimaryKey);
  if (primaryColumns.length === 0) {
    throw badRequest("At least one primary key column is required");
  }

  const columnSql = normalizedColumns.map((col) => {
    const nullClause = col.nullable ? "" : " NOT NULL";
    const defaultClause = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : "";
    return `"${col.name}" ${col.sqlType}${nullClause}${defaultClause}`;
  });

  const primaryKeySql = `PRIMARY KEY (${primaryColumns.map((c) => `"${c.name}"`).join(", ")})`;

  const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
  const ddl = `CREATE TABLE ${qualifiedTable} (\n  ${columnSql.join(",\n  ")},\n  ${primaryKeySql}\n);`;

  const client = await pool.connect();
  try {
    const existingOid = await getTableOid(client, PUBLIC_SCHEMA, normalizedTableName);
    if (existingOid) {
      throw badRequest(`Table \"${normalizedTableName}\" already exists`);
    }

    await client.query(ddl);

    const result = {
      tableName: normalizedTableName,
      columns: normalizedColumns.map((col) => ({
        name: col.name,
        type: col.type,
        sqlType: col.sqlType,
        isPrimaryKey: col.isPrimaryKey,
        nullable: col.nullable,
        defaultValue: col.defaultValue ?? null
      }))
    };

    await recordTable(client, normalizedTableName, result.columns);

    return result;
  } finally {
    client.release();
  }
}

export async function listDynamicTables() {
  const client = await pool.connect();
  try {
    await ensureRegistryTable(client);

    const { rows: registryRows } = await client.query(
      `SELECT table_name AS "tableName",
              COALESCE(display_name, table_name) AS "displayName",
              expose_frontend AS "exposeFrontend",
              header_bg_color AS "headerBgColor",
              header_text_color AS "headerTextColor",
              body_text_color AS "bodyTextColor",
              columns AS "columns"
         FROM ${REGISTRY_TABLE}
        ORDER BY table_name`
    );

    const registryNames = new Set(registryRows.map((r) => r.tableName));

    const { rows: dbTables } = await client.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
          AND table_name <> $2`,
      [PUBLIC_SCHEMA, REGISTRY_TABLE]
    );

    for (const row of dbTables) {
      const name = row.table_name;
      if (registryNames.has(name) || name === REGISTRY_TABLE) {
        continue;
      }
      try {
        const definition = await introspectTable(client, name);
        await recordTable(client, definition.tableName, definition.columns);
        registryRows.push({
          tableName: definition.tableName,
          displayName: definition.displayName,
          exposeFrontend: definition.exposeFrontend,
          headerBgColor: null,
          headerTextColor: null,
          bodyTextColor: null,
          columns: definition.columns
        });
      } catch (err) {
        // Skip tables that cannot be introspected
      }
    }

    // Sort again after potential additions
    return registryRows.sort((a, b) => a.tableName.localeCompare(b.tableName));
  } finally {
    client.release();
  }
}

export async function getDynamicTable(tableName) {
  const normalizedTableName = normalizeTableName(tableName);
  const client = await pool.connect();
  try {
    await ensureRegistryTable(client);
    const { rows } = await client.query(
      `SELECT table_name AS "tableName",
              COALESCE(display_name, table_name) AS "displayName",
              expose_frontend AS "exposeFrontend",
              header_bg_color AS "headerBgColor",
              header_text_color AS "headerTextColor",
              body_text_color AS "bodyTextColor",
              columns AS "columns"
         FROM ${REGISTRY_TABLE}
        WHERE table_name = $1
        LIMIT 1`,
      [normalizedTableName]
    );
    const row = rows[0];
    if (row) {
      return row;
    }

    const definition = await introspectTable(client, normalizedTableName);
    await recordTable(client, definition.tableName, definition.columns);
    return {
      ...definition,
      headerBgColor: null,
      headerTextColor: null,
      bodyTextColor: null
    };
  } finally {
    client.release();
  }
}

export async function updateDynamicTableSettings(tableName, settings = {}) {
  const normalizedTableName = normalizeTableName(tableName);
  const displayName = typeof settings.displayName === "string" && settings.displayName.trim()
    ? settings.displayName.trim()
    : normalizedTableName;
  const exposeFrontend = settings.exposeFrontend === true;
  const headerBgColor = normalizeColor(settings.headerBgColor, "Header background color");
  const headerTextColor = normalizeColor(settings.headerTextColor, "Header text color");
  const bodyTextColor = normalizeColor(settings.bodyTextColor, "Body text color");

  const client = await pool.connect();
  try {
    await ensureRegistryTable(client);
    const result = await client.query(
      `UPDATE ${REGISTRY_TABLE}
          SET display_name = $2,
              expose_frontend = $3,
              header_bg_color = $4,
              header_text_color = $5,
              body_text_color = $6
        WHERE table_name = $1
        RETURNING table_name AS "tableName",
                  COALESCE(display_name, table_name) AS "displayName",
                  expose_frontend AS "exposeFrontend",
                  header_bg_color AS "headerBgColor",
                  header_text_color AS "headerTextColor",
                  body_text_color AS "bodyTextColor",
                  columns AS "columns"`,
      [normalizedTableName, displayName, exposeFrontend, headerBgColor, headerTextColor, bodyTextColor]
    );
    if (!result.rowCount) {
      throw badRequest(`Table "${normalizedTableName}" is not registered for CMS management`);
    }
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function addDynamicColumn(tableName, column) {
  const normalizedTableName = normalizeTableName(tableName);
  const newColumn = normalizeColumn(column);
  if (newColumn.isPrimaryKey) {
    throw badRequest("Adding primary key columns via CMS is not supported");
  }

  const client = await pool.connect();
  try {
    await ensureRegistryTable(client);
    const { rows } = await client.query(
      `SELECT columns FROM ${REGISTRY_TABLE} WHERE table_name = $1 LIMIT 1`,
      [normalizedTableName]
    );
    const existingColumns = Array.isArray(rows[0]?.columns) ? rows[0].columns : (await introspectTable(client, normalizedTableName)).columns;

    if (existingColumns.length >= MAX_COLUMNS) {
      throw badRequest(`A maximum of ${MAX_COLUMNS} columns is allowed`);
    }
    if (existingColumns.some((c) => c.name.toLowerCase() === newColumn.name.toLowerCase())) {
      throw badRequest(`Column "${newColumn.name}" already exists`);
    }

    const nullClause = newColumn.nullable ? "" : " NOT NULL";
    const defaultClause = newColumn.defaultValue ? ` DEFAULT ${newColumn.defaultValue}` : "";
    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
    await client.query(
      `ALTER TABLE ${qualifiedTable} ADD COLUMN "${newColumn.name}" ${newColumn.sqlType}${nullClause}${defaultClause}`
    );

    const updated = mergeColumns(existingColumns, {
      name: newColumn.name,
      type: newColumn.type,
      sqlType: newColumn.sqlType,
      isPrimaryKey: newColumn.isPrimaryKey,
      nullable: newColumn.nullable,
      defaultValue: newColumn.defaultValue ?? null
    });

    await client.query(
      `UPDATE ${REGISTRY_TABLE} SET columns = $2 WHERE table_name = $1`,
      [normalizedTableName, JSON.stringify(updated)]
    );

    return updated;
  } finally {
    client.release();
  }
}

export async function dropDynamicColumn(tableName, columnName) {
  const normalizedTableName = normalizeTableName(tableName);
  const normalizedColumn = typeof columnName === "string" ? columnName.trim() : "";
  if (!IDENTIFIER_REGEX.test(normalizedColumn)) {
    throw badRequest("Invalid column name");
  }

  const client = await pool.connect();
  try {
    await ensureRegistryTable(client);
    const { rows } = await client.query(
      `SELECT columns FROM ${REGISTRY_TABLE} WHERE table_name = $1 LIMIT 1`,
      [normalizedTableName]
    );
    const existingColumns = Array.isArray(rows[0]?.columns) ? rows[0].columns : (await introspectTable(client, normalizedTableName)).columns;

    const target = existingColumns.find((c) => c.name === normalizedColumn);
    if (!target) {
      throw badRequest(`Column "${normalizedColumn}" does not exist`);
    }
    if (target.isPrimaryKey) {
      throw badRequest("Dropping primary key columns via CMS is not supported");
    }

    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
    await client.query(`ALTER TABLE ${qualifiedTable} DROP COLUMN "${normalizedColumn}"`);

    const updated = existingColumns.filter((c) => c.name !== normalizedColumn);
    await client.query(
      `UPDATE ${REGISTRY_TABLE} SET columns = $2 WHERE table_name = $1`,
      [normalizedTableName, JSON.stringify(updated)]
    );

    return updated;
  } finally {
    client.release();
  }
}

export async function insertDynamicRow(tableName, row) {
  const definition = await getDynamicTable(tableName);
  const columns = Array.isArray(definition.columns) ? definition.columns : [];
  const columnMap = new Map(columns.map((col) => [col.name, col]));

  const payload = row && typeof row === "object" ? row : {};
  const keys = Object.keys(payload);

  if (!keys.length) {
    throw badRequest("Provide at least one column value to insert");
  }

  const missingRequired = columns
    .filter((c) => !c.nullable && !c.defaultValue)
    .filter((c) => payload[c.name] === undefined);
  if (missingRequired.length) {
    throw badRequest(`Missing required columns: ${missingRequired.map((c) => c.name).join(", ")}`);
  }

  const invalidKeys = keys.filter((key) => !columnMap.has(key));
  if (invalidKeys.length) {
    throw badRequest(`Unknown columns: ${invalidKeys.join(", ")}`);
  }

  const orderedColumns = keys.map((key) => ({
    name: key,
    meta: columnMap.get(key),
    value: payload[key]
  }));

  const placeholders = orderedColumns.map((_, idx) => `$${idx + 1}`);
  const values = orderedColumns.map(({ meta, value }) => coerceValue(meta?.type, value));

  const columnSql = orderedColumns.map((c) => `"${c.name}"`).join(", ");

  const client = await pool.connect();
  try {
    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, definition.tableName);
    const insertSql = `INSERT INTO ${qualifiedTable} (${columnSql}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const result = await client.query(insertSql, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

function coerceValue(type, value) {
  if (value === null || value === undefined) {
    return null;
  }
  const key = typeof type === "string" ? type.toLowerCase() : "";
  if (key === "integer" || key === "bigint") {
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw badRequest(`Value for ${key} column must be numeric`);
    }
    return num;
  }
  if (key === "numeric") {
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw badRequest("Value for numeric column must be numeric");
    }
    return num;
  }
  if (key === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }
    const str = `${value}`.toLowerCase();
    if (str === "true" || str === "1") return true;
    if (str === "false" || str === "0") return false;
    throw badRequest("Value for boolean column must be true/false");
  }
  if (key === "jsonb") {
    if (typeof value === "object") {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      throw badRequest("Value for jsonb column must be valid JSON");
    }
  }
  if (key === "date") {
    return normalizeDateValue(value);
  }
  return value;
}

function normalizeDateValue(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw badRequest("Value for date column must be a valid date");
    }
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Already ISO date format
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Common admin input formats: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const dmY = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmY) {
    const day = Number(dmY[1]);
    const month = Number(dmY[2]);
    const year = Number(dmY[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw badRequest("Value for date column is out of range");
    }

    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() !== month - 1 ||
      dt.getUTCDate() !== day
    ) {
      throw badRequest("Value for date column is out of range");
    }

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  // Fallback to native parser for ISO datetime-like values
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw badRequest(
    "Value for date column must be in YYYY-MM-DD or DD.MM.YYYY format"
  );
}

export async function fetchPublicTable(tableName, limit = 200) {
  const normalizedTableName = normalizeTableName(tableName);
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 500) : 200;

  const client = await pool.connect();
  try {
    await ensureRegistryTable(client);
    await ensurePageTableMapping(client);

    const { rows: registryRows } = await client.query(
      `SELECT expose_frontend AS "exposeFrontend",
              header_bg_color AS "headerBgColor",
              header_text_color AS "headerTextColor",
              body_text_color AS "bodyTextColor",
              columns
         FROM ${REGISTRY_TABLE}
        WHERE table_name = $1
        LIMIT 1`,
      [normalizedTableName]
    );

    const registry = registryRows[0] || null;

    let allowPublic = registry?.exposeFrontend === true;

    if (!allowPublic) {
      const { rows: pageLinks } = await client.query(
        `SELECT 1
           FROM cms_page_tables t
           JOIN cms_pages p ON p.menu_item_id = t.menu_item_id
          WHERE t.table_name = $1
            AND p.status = 'published'
          LIMIT 1`,
        [normalizedTableName]
      );
      allowPublic = pageLinks.length > 0;
    }

    if (!allowPublic) {
      // Graceful fallback: return empty table payload instead of 404
      return {
        tableName: normalizedTableName,
        headerBgColor: null,
        headerTextColor: null,
        bodyTextColor: null,
        columns: [],
        rows: []
      };
    }

    let definition;
    try {
      definition = await introspectTable(client, normalizedTableName);
    } catch (error) {
      const message = String(error?.message || "");
      if (error?.statusCode === 400 && /does not exist in schema/i.test(message)) {
        return {
          tableName: normalizedTableName,
          headerBgColor: registry?.headerBgColor || null,
          headerTextColor: registry?.headerTextColor || null,
          bodyTextColor: registry?.bodyTextColor || null,
          columns: [],
          rows: []
        };
      }
      throw error;
    }
    const currentColumns = definition.columns;
    let columns = currentColumns;

    if (!Array.isArray(registry?.columns)) {
      await upsertRegistry(client, normalizedTableName, currentColumns, true);
    } else {
      const registeredColumns = registry.columns;
      const currentNames = new Set(currentColumns.map((col) => col.name));
      const registeredNames = new Set(registeredColumns.map((col) => col?.name));
      const hasDrift =
        currentColumns.length !== registeredColumns.length ||
        currentColumns.some((col) => !registeredNames.has(col.name)) ||
        registeredColumns.some((col) => !currentNames.has(col?.name));

      if (hasDrift) {
        await client.query(
          `UPDATE ${REGISTRY_TABLE}
              SET columns = $2::jsonb
            WHERE table_name = $1`,
          [normalizedTableName, JSON.stringify(currentColumns)]
        );
      }
    }

    if (allowPublic && registry?.exposeFrontend !== true) {
      await client.query(
        `UPDATE ${REGISTRY_TABLE}
            SET expose_frontend = TRUE
          WHERE table_name = $1`,
        [normalizedTableName]
      );
    }

    const columnNames = columns.map((c) => `"${c.name}"`).join(", ");
    const orderBy = buildPreferredOrderClause(columns);

    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
    const { rows } = await client.query(
      `SELECT ${columnNames || '*'}
         FROM ${qualifiedTable}
         ${orderBy}
         LIMIT ${safeLimit}`
    );

    return {
      tableName: normalizedTableName,
      headerBgColor: registry?.headerBgColor || null,
      headerTextColor: registry?.headerTextColor || null,
      bodyTextColor: registry?.bodyTextColor || null,
      columns,
      rows
    };
  } finally {
    client.release();
  }
}

function requirePrimaryKeys(columns) {
  const primary = columns.filter((c) => c.isPrimaryKey);
  if (!primary.length) {
    throw badRequest("Table does not have a primary key");
  }
  return primary;
}

function buildWhereClause(primaryColumns, payloadKeys, valuesOut, offset = 0) {
  const clauses = primaryColumns.map((col, idx) => {
    if (payloadKeys[col.name] === undefined) {
      throw badRequest(`Missing primary key value for ${col.name}`);
    }
    const value = coerceValue(col.type, payloadKeys[col.name]);
    valuesOut.push(value);
    if (col.name === "_ctid") {
      return `ctid = $${idx + 1 + offset}::tid`;
    }
    return `"${col.name}" = $${idx + 1 + offset}`;
  });
  return clauses.join(" AND ");
}

function buildPreferredOrderClause(columns) {
  const has = (name) => columns.some((c) => c?.name === name);
  const primary = columns.filter((c) => c?.isPrimaryKey);

  if (has("sort_order")) {
    if (has("created_at")) {
      return 'ORDER BY "sort_order" ASC NULLS LAST, "created_at" DESC NULLS LAST';
    }
    return 'ORDER BY "sort_order" ASC NULLS LAST';
  }

  if (has("created_at")) {
    return 'ORDER BY "created_at" DESC NULLS LAST';
  }

  if (primary.length) {
    return `ORDER BY ${primary.map((c) => `"${c.name}"`).join(",")}`;
  }

  if (columns.length) {
    return `ORDER BY "${columns[0].name}"`;
  }

  return "";
}

export async function listDynamicRows(tableName, limit = 200) {
  const normalizedTableName = normalizeTableName(tableName);
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 500) : 200;
  const definition = await getDynamicTable(normalizedTableName);
  const columns = Array.isArray(definition.columns) ? definition.columns : [];
  const primary = columns.filter((c) => c.isPrimaryKey);
  const hasPrimary = primary.length > 0;
  const orderClause = buildPreferredOrderClause(columns);

  const selectColumns = hasPrimary ? "*" : "ctid::text as _ctid, *";
  const columnsWithKey = hasPrimary
    ? columns
    : [
        ...columns,
        {
          name: "_ctid",
          type: "tid",
          sqlType: "tid",
          isPrimaryKey: true,
          nullable: false,
          defaultValue: null
        }
      ];
  const client = await pool.connect();
  try {
    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
    const { rows } = await client.query(
      `SELECT ${selectColumns} FROM ${qualifiedTable} ${orderClause} LIMIT $1`,
      [safeLimit]
    );
    return { rows, columns: columnsWithKey };
  } finally {
    client.release();
  }
}

export async function updateDynamicRow(tableName, keys = {}, changes = {}) {
  const normalizedTableName = normalizeTableName(tableName);
  const definition = await getDynamicTable(normalizedTableName);
  const columns = Array.isArray(definition.columns) ? definition.columns : [];
  const basePrimary = columns.filter((c) => c.isPrimaryKey);
  const primary = basePrimary.length
    ? basePrimary
    : [
        {
          name: "_ctid",
          type: "tid",
          sqlType: "tid",
          isPrimaryKey: true,
          nullable: false,
          defaultValue: null
        }
      ];
  const columnMap = new Map(columns.map((c) => [c.name, c]));

  const changeEntries = Object.entries(changes).filter(([, v]) => v !== undefined);
  if (!changeEntries.length) {
    throw badRequest("Provide at least one column to update");
  }

  const invalid = changeEntries.filter(([name]) => !columnMap.has(name));
  if (invalid.length) {
    throw badRequest(`Cannot update columns: ${invalid.map(([name]) => name).join(", ")}`);
  }

  const values = [];
  const setSql = changeEntries
    .map(([name, value], idx) => {
      const meta = columnMap.get(name);
      values.push(coerceValue(meta?.type, value));
      return `"${name}" = $${idx + 1}`;
    })
    .join(", ");

  const whereSql = buildWhereClause(primary, keys, values, changeEntries.length);

  const client = await pool.connect();
  try {
    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
    const result = await client.query(
      `UPDATE ${qualifiedTable} SET ${setSql} WHERE ${whereSql} RETURNING *`,
      values
    );
    if (!result.rowCount) {
      const err = badRequest("Row not found for provided primary key");
      err.statusCode = 404;
      throw err;
    }
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function deleteDynamicRow(tableName, keys = {}) {
  const normalizedTableName = normalizeTableName(tableName);
  const definition = await getDynamicTable(normalizedTableName);
  const columns = Array.isArray(definition.columns) ? definition.columns : [];
  const basePrimary = columns.filter((c) => c.isPrimaryKey);
  const primary = basePrimary.length
    ? basePrimary
    : [
        {
          name: "_ctid",
          type: "tid",
          sqlType: "tid",
          isPrimaryKey: true,
          nullable: false,
          defaultValue: null
        }
      ];

  const values = [];
  const whereSql = buildWhereClause(primary, keys, values, 0);

  const client = await pool.connect();
  try {
    const qualifiedTable = qualifyTable(PUBLIC_SCHEMA, normalizedTableName);
    const result = await client.query(
      `DELETE FROM ${qualifiedTable} WHERE ${whereSql} RETURNING *`,
      values
    );
    if (!result.rowCount) {
      const err = badRequest("Row not found for provided primary key");
      err.statusCode = 404;
      throw err;
    }
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function uploadCmsFile(file) {
  if (!file) {
    throw badRequest("File is required");
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const ext = path.extname(file.originalname || "");
  const targetName = `${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, targetName);

  await fs.promises.rename(file.path, targetPath);

  // Persist uploaded binary in cms_media as a fallback source so files survive
  // stateless deployments where local filesystem artifacts are not retained.
  try {
    const fileBytes = await fs.promises.readFile(targetPath);
    const mimeType = inferMediaMimeType(targetName, file.mimetype);
    const category = inferMediaCategory(mimeType);

    await pool.query(
      `INSERT INTO cms_media (
         file_name, original_name, mime_type, category, size_bytes, storage_path, file_bytes, alt_text, uploaded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL)
       ON CONFLICT (file_name) DO UPDATE
       SET original_name = EXCLUDED.original_name,
           mime_type = EXCLUDED.mime_type,
           category = EXCLUDED.category,
           size_bytes = EXCLUDED.size_bytes,
           storage_path = EXCLUDED.storage_path,
           file_bytes = EXCLUDED.file_bytes`,
      [
        targetName,
        file.originalname || targetName,
        mimeType,
        category,
        Number(file.size || fileBytes.length || 0),
        targetPath,
        fileBytes,
      ],
    );
  } catch (error) {
    console.warn("cms upload fallback persistence failed:", error?.message || error);
  }

  const url = `/uploads/media/${targetName}`;
  return {
    url,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}
