import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "scpdc"
  });

  await client.connect();
  const result = await client.query(
    "SELECT menu_item_id, status, hero_image_path, updated_at FROM cms_pages WHERE menu_item_id = $1",
    [31]
  );
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
}

run().catch((error) => {
  console.error("DB check failed", error);
  process.exitCode = 1;
});
