import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Client } = pg;

// Function to resolve SSL config for Azure hosts
function resolveSslConfig(host) {
  if (host && host.includes("azure.com")) {
    return { rejectUnauthorized: false };
  }
  return false;
}

async function testConnection(config, label) {
  console.log(`Testing ${label} with config:`, { ...config, password: "****" });
  const client = new Client({
    ...config,
    ssl: resolveSslConfig(config.host),
  });
  try {
    await client.connect();
    console.log(`✅ Success: Connected to ${label}`);
    await client.end();
    return true;
  } catch (err) {
    console.error(
      `❌ Failed: Could not connect to ${label}. Error: ${err.message}`,
    );
    return false;
  }
}

async function run() {
  // 1. Current .env config
  await testConnection(
    {
      host: process.env.DB_HOST || process.env.PGHOST || "localhost",
      port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
      user: process.env.DB_USER || process.env.PGUSER || "postgres",
      password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
      database: process.env.DB_NAME || process.env.PGDATABASE || "scpdc",
    },
    "Current .env config",
  );

  // 2. Common default using environment fallbacks
  await testConnection(
    {
      host: process.env.DB_HOST || process.env.PGHOST || "localhost",
      port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
      user: process.env.DB_USER || process.env.PGUSER || "postgres",
      password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
      database: process.env.DB_NAME || process.env.PGDATABASE || "scpdc",
    },
    "Default Postgres using .env fallbacks",
  );

  // 3. CMS-specific config using environment fallbacks
  await testConnection(
    {
      host: process.env.DB_HOST || process.env.PGHOST || "localhost",
      port: Number(process.env.DB_PORT || process.env.PGPORT || 55400),
      user: process.env.DB_USER || process.env.PGUSER || "postgres",
      password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
      database: process.env.DB_NAME || process.env.PGDATABASE || "scpd_cms",
    },
    "CMS Config using .env fallbacks",
  );
}

run();
