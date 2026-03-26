import { pool } from "./src/models/db.js";
import fs from "fs";

async function checkDefaults() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cms_media'
      ORDER BY ordinal_position;
    `);

        fs.writeFileSync("defaults_info.json", JSON.stringify(rows, null, 2));
        console.log("Defaults info written to defaults_info.json");

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

checkDefaults();
