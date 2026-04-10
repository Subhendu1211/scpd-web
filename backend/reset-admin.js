import bcrypt from "bcrypt";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const p = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
  user: process.env.DB_USER || process.env.PGUSER || "postgres",
  password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.PGDATABASE || "scpd_cms",
});

async function main() {
  try {
    const hash = await bcrypt.hash("admin123", 10);
    const result = await p.query(
      "UPDATE admin_users SET password_hash = $1 WHERE email = $2",
      [hash, "admin@example.com"],
    );
    console.log("Updated", result.rowCount, "rows");
  } catch (err) {
    console.error(err);
  } finally {
    await p.end();
  }
}

main();
