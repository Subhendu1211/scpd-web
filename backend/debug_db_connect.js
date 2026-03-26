import pg from "pg";
const { Client } = pg;

async function testConnection(config, label) {
  console.log(`Testing ${label} with config:`, { ...config, password: "****" });
  const client = new Client(config);
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
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: "secret", // from .env
      database: "scpdc",
    },
    "Current .env config (Port 5432, pw: secret)",
  );

  // 2. Common default
  await testConnection(
    {
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: "postgres",
      database: "scpdc",
    },
    "Default Postgres (Port 5432, pw: postgres)",
  );

  // 3. Admin-t CMS config
  await testConnection(
    {
      host: "localhost",
      port: 55400,
      user: "postgres",
      password: "postgres",
      database: "scpd_cms",
    },
    "CMS Config (Port 55400, pw: postgres)",
  );
}

run();
