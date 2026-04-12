#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Client } = pg;
const LOCAL_MEDIA_DIR = path.resolve(__dirname, "../uploads/media");
const URL_PATTERN = /\/uploads\/media\/([A-Za-z0-9._%-]+)/gi;

function q(identifier) {
  return `"${String(identifier).replace(/"/g, "\"\"")}"`;
}

function inferMimeType(fileName, provided = "") {
  const mime = String(provided || "").trim().toLowerCase();
  if (mime) return mime;
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext] || "application/octet-stream";
}

function inferCategory(mimeType) {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "newspaper";
}

function extractNamesFromString(value, set) {
  if (!value) return;
  const str = String(value);
  let match;
  while ((match = URL_PATTERN.exec(str)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    try {
      set.add(decodeURIComponent(raw));
    } catch {
      set.add(raw);
    }
  }
}

async function collectReferencedFileNames(client) {
  const names = new Set();

  const existing = await client.query(
    `SELECT file_name FROM public.cms_media WHERE file_name IS NOT NULL`
  );
  for (const row of existing.rows) {
    if (row.file_name) names.add(String(row.file_name));
  }

  const { rows: tableRows } = await client.query(
    `SELECT tablename
       FROM pg_catalog.pg_tables
      WHERE schemaname='public'
      ORDER BY tablename`
  );

  for (const row of tableRows) {
    const table = row.tablename;
    if (table === "cms_media") continue;
    const sql = `SELECT to_jsonb(t) AS row_data FROM public.${q(table)} t`;
    const { rows } = await client.query(sql);
    for (const item of rows) {
      extractNamesFromString(JSON.stringify(item.row_data), names);
    }
  }

  // Include every local uploaded file as well, so PDFs/images that are not
  // currently referenced in table text still get restored for direct links.
  const localEntries = await fs.promises.readdir(LOCAL_MEDIA_DIR, {
    withFileTypes: true,
  });
  for (const entry of localEntries) {
    if (entry.isFile()) {
      names.add(entry.name);
    }
  }

  return names;
}

async function run() {
  if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
    throw new Error(`Local media directory not found: ${LOCAL_MEDIA_DIR}`);
  }

  const remote = new Client({
    host: process.env.DB_HOST || process.env.PGHOST,
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    user: process.env.DB_USER || process.env.PGUSER,
    password: String(process.env.DB_PASS || process.env.PGPASSWORD || "").replace(
      /^"|"$/g,
      ""
    ),
    database: process.env.DB_NAME || process.env.PGDATABASE || "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await remote.connect();

  try {
    const names = await collectReferencedFileNames(remote);
    const sorted = Array.from(names).sort();

    let upserted = 0;
    let missingLocal = 0;

    for (const fileName of sorted) {
      const localPath = path.join(LOCAL_MEDIA_DIR, fileName);
      if (!fs.existsSync(localPath)) {
        missingLocal += 1;
        continue;
      }

      const fileBytes = await fs.promises.readFile(localPath);
      const stats = await fs.promises.stat(localPath);
      const mimeType = inferMimeType(fileName);
      const category = inferCategory(mimeType);

      await remote.query(
        `INSERT INTO public.cms_media
           (file_name, original_name, mime_type, category, size_bytes, storage_path, file_bytes, alt_text, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL)
         ON CONFLICT (file_name) DO UPDATE
         SET original_name = EXCLUDED.original_name,
             mime_type = EXCLUDED.mime_type,
             category = EXCLUDED.category,
             size_bytes = EXCLUDED.size_bytes,
             storage_path = EXCLUDED.storage_path,
             file_bytes = EXCLUDED.file_bytes`,
        [
          fileName,
          fileName,
          mimeType,
          category,
          Number(stats.size || fileBytes.length || 0),
          path.join("uploads", "media", fileName),
          fileBytes,
        ]
      );

      upserted += 1;
    }

    console.log(`Referenced files discovered: ${sorted.length}`);
    console.log(`Backfilled/updated files: ${upserted}`);
    console.log(`Referenced but missing locally: ${missingLocal}`);
  } finally {
    await remote.end();
  }
}

run().catch((error) => {
  console.error("Backfill failed:", error.message);
  process.exit(1);
});
