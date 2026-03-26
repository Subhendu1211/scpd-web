import pg from "pg";
const { Client } = pg;

async function checkTables() {
  console.log("Checking tables in scpd_cms on port 55400...");
  const client = new Client({
    host: "localhost",
    port: 55400,
    user: "postgres",
    password: "postgres",
    database: "scpd_cms",
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
