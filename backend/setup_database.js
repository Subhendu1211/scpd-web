import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_CONFIG = {
  host: process.env.DB_HOST || process.env.PGHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
  user: process.env.DB_USER || process.env.PGUSER || "postgres",
  password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
};

const TARGET_DB = process.env.DB_NAME || process.env.PGDATABASE || "scpdc";

async function setup() {
  console.log("🚀 Starting Database Setup...");

  // 1. Connect to 'postgres' to create the new database
  const sysClient = new Client({ ...DB_CONFIG, database: "postgres" });
  try {
    await sysClient.connect();
    console.log("✅ Connected to system database");

    const dbName = TARGET_DB;
    const res = await sysClient.query(
      `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`,
    );

    if (res.rowCount === 0) {
      console.log(`Creating database ${dbName}...`);
      await sysClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created.`);
    } else {
      console.log(`ℹ️ Database ${dbName} already exists.`);
    }
    await sysClient.end();
  } catch (e) {
    console.error("❌ Error during database creation:", e);
    process.exit(1);
  }

  // 2. Connect to the new database and run init script
  const dbClient = new Client({ ...DB_CONFIG, database: TARGET_DB });
  try {
    await dbClient.connect();
    console.log("✅ Connected to scpdc database");

    const initSqlPath = path.resolve(__dirname, "../infra/db/init.sql");
    const initSql = fs.readFileSync(initSqlPath, "utf-8");

    console.log("Executing init.sql...");
    await dbClient.query(initSql);
    console.log("✅ Schema initialized successfully.");

    await dbClient.end();
    console.log("🎉 Setup complete!");
  } catch (e) {
    console.error("❌ Error during schema initialization:", e);
    process.exit(1);
  }
}

setup();
