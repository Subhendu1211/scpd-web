import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'scpd'
});

async function checkPage() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
      SELECT p.id, p.status, p.hero_image_path, p.summary, p.summary_or, p.body, p.body_or, m.path, m.label
      FROM cms_pages p
      JOIN cms_menu_items m ON m.id = p.menu_item_id
      WHERE m.path = '/publications/success-stories'
    `);
        console.log('Page Data:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkPage();
