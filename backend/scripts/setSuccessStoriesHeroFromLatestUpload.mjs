import dotenv from "dotenv";
import pg from "pg";
import { promises as fs } from "fs";
import path from "path";

dotenv.config();

const { Client } = pg;

const MENU_ITEM_ID = 31; // Publications > Success Stories
const uploadsDir = path.resolve(process.cwd(), "uploads", "media");
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

async function findLatestImageFile() {
  const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()));

  if (!files.length) {
    return null;
  }

  const withTimes = await Promise.all(
    files.map(async (name) => {
      const stat = await fs.stat(path.join(uploadsDir, name));
      return { name, mtimeMs: stat.mtimeMs };
    })
  );

  withTimes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withTimes[0]?.name ?? null;
}

async function run() {
  const latest = await findLatestImageFile();
  if (!latest) {
    console.error(`No image files found in ${uploadsDir}`);
    process.exitCode = 1;
    return;
  }

  const heroUrl = `/uploads/media/${latest}`;

  const client = new Client({
    host: process.env.DB_HOST || process.env.PGHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    user: process.env.DB_USER || process.env.PGUSER || "postgres",
    password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
    database: process.env.DB_NAME || process.env.PGDATABASE || "scpdc"
  });

  await client.connect();

  const update = await client.query(
    "UPDATE cms_pages SET hero_image_path = $1, updated_at = now() WHERE menu_item_id = $2 RETURNING menu_item_id, status, hero_image_path",
    [heroUrl, MENU_ITEM_ID]
  );

  console.log(JSON.stringify({ selectedFile: latest, heroUrl, updated: update.rows }, null, 2));
  await client.end();
}

run().catch((error) => {
  console.error("Failed to set Success Stories hero image", error);
  process.exitCode = 1;
});
