import { pool } from "./src/models/db.js";
import fs from "fs";

async function checkData() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
      SELECT id, file_name, category, created_at
      FROM cms_media
      ORDER BY id DESC
      LIMIT 10;
    `);

        fs.writeFileSync("recent_media.json", JSON.stringify(rows, null, 2));
        console.log("Recent media info written to recent_media.json");

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

checkData();
