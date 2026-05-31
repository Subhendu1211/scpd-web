import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
const { Pool } = pkg;
const useSsl =
  (String(process.env.DB_SSL || "").toLowerCase() === "true") ||
  (String(process.env.PGSSLMODE || "").toLowerCase() === "require") ||
  !!process.env.DATABASE_URL;
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      },
);

const q = await pool.query(`
  select
    o.id,
    o.delivery_channel,
    o.destination,
    o.attempts,
    o.expires_at,
    o.consumed_at,
    o.created_at,
    u.email as admin_email,
    now() as db_now,
    (o.expires_at < now()) as is_expired
  from admin_login_otps o
  join admin_users u on u.id = o.admin_user_id
  where o.id = 6
  limit 1
`);

console.log(JSON.stringify(q.rows, null, 2));
await pool.end();
