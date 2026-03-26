import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "scpd",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "postgres"
    });