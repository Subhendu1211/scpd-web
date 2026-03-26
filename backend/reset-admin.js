import bcrypt from "bcrypt";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const p = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "scpd_cms",
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
