import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'scpd'
});

async function run() {
    try {
        const res = await pool.query("SELECT file_name FROM cms_media WHERE category = 'photo' LIMIT 1");
        if (res.rows.length > 0) {
            const fileName = res.rows[0].file_name;
            const imgPath = `/uploads/media/${fileName}`;
            await pool.query("UPDATE cms_pages SET hero_image_path = $1 WHERE menu_item_id = (SELECT id FROM cms_menu_items WHERE path = '/publications/success-stories')", [imgPath]);
            console.log('Successfully updated hero_image_path to:', imgPath);
        } else {
            console.log('No images found in cms_media');
        }
    } catch (e) {
        console.error('Error updating database:', e);
    } finally {
        await pool.end();
    }
}

run();
