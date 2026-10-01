import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Client } = pg;

async function testConnection() {
  console.log("Testing database connection using environment configuration...");
  const client = new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 55400),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "scpdc",
  });
  try {
    await client.connect();
    console.log("✅ Success: Connected to scpdc on 55400");
    await client.end();
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
    if (err.code === "3D000") {
      console.log("Database 'scpdc' does not exist.");
    }
  }
}

testConnection();
