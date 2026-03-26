import pg from "pg";
const { Client } = pg;

async function testConnection() {
  console.log("Testing connection to database scpdc on port 55400...");
  const client = new Client({
    host: "localhost",
    port: 55400,
    user: "postgres",
    password: "postgres",
    database: "scpdc",
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
