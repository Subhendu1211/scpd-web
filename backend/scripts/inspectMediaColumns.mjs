import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "scpdc",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "secret"
});

try {
  const result = await pool.query(
    "select column_name, data_type, is_nullable from information_schema.columns where table_name = 'cms_media' order by ordinal_position"
  );
  console.log(result.rows);
} catch (error) {
  console.error(error);
} finally {
  await pool.end();
}
