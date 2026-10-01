import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function createMissingTable() {
  console.log("Creating cms_page_tables table using environment configuration...");
  const client = new Client({
    host: process.env.DB_HOST || process.env.PGHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.PGPORT || 55400),
    user: process.env.DB_USER || process.env.PGUSER || "postgres",
    password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
    database: process.env.DB_NAME || process.env.PGDATABASE || "scpdc",
  });

  try {
    await client.connect();
    console.log("✅ Connected to scpdc database");

    await client.query(`
            CREATE TABLE IF NOT EXISTS cms_page_tables (
                menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
                table_name TEXT NOT NULL
            );
        `);

    console.log("✅ Table cms_page_tables created successfully!");
    await client.end();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createMissingTable();
