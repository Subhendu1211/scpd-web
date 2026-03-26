import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

async function createMissingTable() {
  console.log("Creating cms_page_tables table...");
  const client = new Client({
    host: "localhost",
    port: 55400,
    user: "postgres",
    password: "postgres",
    database: "scpdc",
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
