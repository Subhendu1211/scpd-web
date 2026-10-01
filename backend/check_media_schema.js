import { pool } from "./src/models/db.js";
import fs from "fs";

async function checkSchema() {
    const client = await pool.connect();
    try {
        const { rows: columns } = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cms_media'
      ORDER BY ordinal_position;
    `);

        const { rows: categories } = await client.query(`
       SELECT pg_get_constraintdef(c.oid) AS def
			 FROM pg_constraint c
			 JOIN pg_class t ON t.oid = c.conrelid
			 WHERE t.relname = 'cms_media'
			   AND c.conname = 'cms_media_category_check'
			 LIMIT 1
    `);

        const result = {
            columns,
            categories
        };

        fs.writeFileSync("schema_info.json", JSON.stringify(result, null, 2));
        console.log("Schema info written to schema_info.json");

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

checkSchema();
