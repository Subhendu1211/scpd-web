import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function checkPort(port, label) {
  console.log(`\n--- Checking Port ${port} (${label}) ---`);
  const client = new Client({
    host: process.env.DB_HOST || process.env.PGHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.PGPORT || port),
    user: process.env.DB_USER || process.env.PGUSER || "postgres",
    password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
    database: process.env.DB_NAME || process.env.PGDATABASE || "postgres",
  });

  try {
    await client.connect();
    console.log(`✅ Connected to Postgres on port ${port}`);

    const res = await client.query(
      "SELECT datname FROM pg_database WHERE datname='scpdc'",
    );
    if (res.rowCount > 0) {
      console.log(`✅ DATABASE 'scpdc' FOUND on port ${port}`);
    } else {
      console.log(`❌ DATABASE 'scpdc' NOT FOUND on port ${port}`);
    }
    await client.end();
  } catch (err) {
    console.log(`❌ Could not connect to port ${port}: ${err.message}`);
  }
}

async function run() {
  console.log("--- Environment Variables ---");
  console.log("DB_HOST:", process.env.DB_HOST || process.env.PGHOST);
  console.log("DB_PORT:", process.env.DB_PORT || process.env.PGPORT);
  console.log("DB_NAME:", process.env.DB_NAME || process.env.PGDATABASE);
  console.log("DATABASE_URL:", process.env.DATABASE_URL || "(not set)");

  await checkPort(5432, "Default");
  await checkPort(55400, "CMS Instance");
}

run();
