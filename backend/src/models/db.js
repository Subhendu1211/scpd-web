import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pg;

function isTruthy(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function shouldLoadDotenv() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return isTruthy(process.env.LOAD_DOTENV_IN_PRODUCTION);
}

const dotEnvPath = path.resolve(__dirname, "..", "..", ".env");
const shouldLoadLocalEnv = shouldLoadDotenv();
const dotenvResult = shouldLoadLocalEnv
  ? dotenv.config({ path: dotEnvPath })
  : { parsed: null };

if (!shouldLoadLocalEnv && process.env.NODE_ENV === "production") {
  console.info(
    "Skipping .env file load in production. Set LOAD_DOTENV_IN_PRODUCTION=true to override.",
  );
}

if (process.env.NODE_ENV === "production" && dotenvResult?.parsed) {
  console.warn(
    "Loaded .env in production. Prefer platform environment variables to avoid stale DB credentials.",
  );
}

function isLocalHost(host) {
  const normalized = String(host || "")
    .trim()
    .toLowerCase();
  return (
    !normalized ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

function readAzurePostgresConnectionString() {
  const preferredKey = process.env.POSTGRESQLCONNSTR_DATABASE_URL;
  if (preferredKey) return preferredKey;

  for (const [key, value] of Object.entries(process.env)) {
    if (/^POSTGRESQLCONNSTR_/i.test(key) && value) {
      return value;
    }
  }
  return null;
}

function extractSslModeFromConnectionString(connectionString) {
  if (!connectionString || !connectionString.includes("://")) return "";
  try {
    const parsed = new URL(connectionString);
    return String(parsed.searchParams.get("sslmode") || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function extractHostFromConnectionString(connectionString) {
  if (!connectionString || !connectionString.includes("://")) return "";
  try {
    const parsed = new URL(connectionString);
    return String(parsed.hostname || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function extractDatabaseFromConnectionString(connectionString) {
  if (!connectionString || !connectionString.includes("://")) return "";
  try {
    const parsed = new URL(connectionString);
    const dbName = String(parsed.pathname || "")
      .replace(/^\/+/, "")
      .trim();
    return decodeURIComponent(dbName);
  } catch {
    return "";
  }
}

function resolveSslConfig({ host, connectionString }) {
  const explicitMode = String(
    process.env.PGSSLMODE || process.env.DB_SSLMODE || "",
  )
    .trim()
    .toLowerCase();
  if (explicitMode === "disable") return false;
  if (["require", "verify-ca", "verify-full", "prefer", "allow"].includes(explicitMode)) {
    return { rejectUnauthorized: false };
  }

  if (Object.prototype.hasOwnProperty.call(process.env, "DB_SSL")) {
    return isTruthy(process.env.DB_SSL) ? { rejectUnauthorized: false } : false;
  }

  const sslModeInUrl = extractSslModeFromConnectionString(connectionString);
  if (sslModeInUrl === "disable") return false;
  if (sslModeInUrl) return { rejectUnauthorized: false };

  if (isLocalHost(host)) return false;

  // Enable SSL for Azure Postgres databases
  if (host && (host.includes("azure.com") || host.includes("database.azure.com"))) {
    return { rejectUnauthorized: false };
  }

  // Safe default for managed DBs (Azure, etc.) in production.
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }

  return false;
}

function parseKeyValueConnectionString(connectionString) {
  if (!connectionString || connectionString.includes("://")) {
    return null;
  }

  const parts = connectionString
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.some((part) => part.includes("="))) {
    return null;
  }

  const values = new Map();
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    values.set(key, value);
  }

  const host = String(values.get("server") || values.get("host") || "").replace(
    /^tcp:/i,
    "",
  );
  const port = Number(values.get("port") || 5432);
  const database = values.get("database") || values.get("initial catalog");
  const user =
    values.get("user id") ||
    values.get("userid") ||
    values.get("uid") ||
    values.get("user") ||
    values.get("username");
  const password = values.get("password") || values.get("pwd");

  if (!host || !database || !user || !password || !Number.isFinite(port)) {
    return null;
  }

  const sslModeFromConn =
    String(values.get("ssl mode") || values.get("sslmode") || "")
      .trim()
      .toLowerCase() || null;
  const ssl =
    resolveSslConfig({
      host,
      connectionString: sslModeFromConn ? `postgres://x?sslmode=${sslModeFromConn}` : "",
    }) || undefined;

  return {
    host,
    port,
    database,
    user,
    password,
    ...(ssl ? { ssl } : {}),
  };
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING ||
  readAzurePostgresConnectionString();

const parsedKeyValueConfig = parseKeyValueConnectionString(connectionString);

const fallbackHost = process.env.DB_HOST || process.env.PGHOST || "localhost";
const connectionHost = extractHostFromConnectionString(connectionString) || fallbackHost;
const connectionDatabaseFromUrl = extractDatabaseFromConnectionString(connectionString);
const fallbackSsl =
  resolveSslConfig({ host: connectionHost, connectionString }) || undefined;

const resolvedDatabase =
  parsedKeyValueConfig?.database ||
  connectionDatabaseFromUrl ||
  process.env.DB_NAME ||
  process.env.PGDATABASE ||
  "scpd";

if (
  connectionString &&
  fallbackHost &&
  extractHostFromConnectionString(connectionString) &&
  fallbackHost.toLowerCase() !== extractHostFromConnectionString(connectionString)
) {
  console.warn(
    "Both DATABASE_URL and DB_HOST/PGHOST are set with different hosts. DATABASE_URL takes precedence.",
  );
}

if (
  process.env.NODE_ENV === "production" &&
  !connectionString &&
  (fallbackHost === "localhost" || resolvedDatabase === "scpd")
) {
  console.warn(
    "Production is using fallback DB defaults (localhost/scpd). Set DATABASE_URL or DB_* variables explicitly.",
  );
}

console.debug("Postgres connection details:", {
  host: connectionHost,
  database: resolvedDatabase,
  usingConnectionString: Boolean(connectionString),
  ssl: Boolean(fallbackSsl),
});

const pool =
  (parsedKeyValueConfig
    ? new Pool(parsedKeyValueConfig)
    : connectionString
    ? new Pool({
        connectionString,
        ...(fallbackSsl ? { ssl: fallbackSsl } : {}),
      })
    : new Pool({
        host: fallbackHost,
        port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
        database: resolvedDatabase,
        user: process.env.DB_USER || process.env.PGUSER || "postgres",
        password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
        ...(fallbackSsl ? { ssl: fallbackSsl } : {}),
      }));

// Keep process alive when idle pooled connections are reset by managed DBs.
pool.on("error", (error) => {
  console.warn("Postgres pool idle client error:", error?.code || error?.message || error);
});

export async function checkDbHealth() {
  const result = await pool.query(
    "SELECT current_database() AS database, current_user AS username",
  );
  return result.rows[0] || null;
}

export { pool };
