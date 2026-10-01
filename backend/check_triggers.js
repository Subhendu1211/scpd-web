import { pool } from "./src/models/db.js";

async function checkTriggers() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'cms_media';
    `);
        console.log("Triggers on cms_media:");
        console.log(JSON.stringify(rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

checkTriggers();
