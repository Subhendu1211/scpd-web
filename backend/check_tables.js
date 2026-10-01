import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Client } = pg;

async function checkTables() {
  console.log("Checking tables in scpd_cms using environment configuration...");
  const client = new Client({
    host: process.env.DB_HOST || process.env.PGHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.PGPORT || 55400),
    user: process.env.DB_USER || process.env.PGUSER || "postgres",
    password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
    database: process.env.DB_NAME || process.env.PGDATABASE || "scpd_cms",
  });
  try {
    await client.connect();
    const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'cms_menu_items';
        `);
    if (res.rows.length > 0) {
      console.log("✅ Found cms_menu_items in scpd_cms!");
    } else {
      console.log("❌ Table cms_menu_items NOT found in scpd_cms.");
    }
    await client.end();
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
  }
}

checkTables();
