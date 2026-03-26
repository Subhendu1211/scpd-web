import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function checkPort(port, label) {
  console.log(`\n--- Checking Port ${port} (${label}) ---`);
  const client = new Client({
    host: "localhost",
    port: port,
    user: "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: "postgres",
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
  console.log("PGPORT:", process.env.PGPORT);
  console.log("PGDATABASE:", process.env.PGDATABASE);
  console.log("DATABASE_URL:", process.env.DATABASE_URL || "(not set)");

  await checkPort(5432, "Default");
  await checkPort(55400, "CMS Instance");
}

run();
