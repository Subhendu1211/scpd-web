#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");

for (const envPath of [
  path.resolve(backendDir, ".env.migration.local"),
  path.resolve(backendDir, ".env"),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const CHUNK_SIZE = Number(process.env.MEDIA_CHUNK_BYTES || 2 * 1024 * 1024);
const RETRIES = Number(process.env.MEDIA_SYNC_RETRIES || 6);
const CONNECTION_TIMEOUT_MS = Number(process.env.MEDIA_CONNECTION_TIMEOUT_MS || 15000);
const DIRECT_UPDATE_THRESHOLD_BYTES = Number(
  process.env.MEDIA_DIRECT_UPDATE_THRESHOLD_BYTES || 64 * 1024 * 1024,
);
const STORE_LARGE_AS_CHUNKS = ["1", "true", "yes", "on"].includes(
  String(process.env.MEDIA_STORE_LARGE_AS_CHUNKS || "").trim().toLowerCase(),
);
const RESUME_CHUNKS = ["1", "true", "yes", "on"].includes(
  String(process.env.MEDIA_RESUME_CHUNKS || "").trim().toLowerCase(),
);
const BYTES_ONLY = ["1", "true", "yes", "on"].includes(
  String(process.env.MEDIA_SYNC_BYTES_ONLY || "").trim().toLowerCase(),
);
const MIN_ID = Number(process.env.MEDIA_SYNC_MIN_ID || 0);
const MAX_ID = Number(process.env.MEDIA_SYNC_MAX_ID || 0);

function isTransientConnectionError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  if (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "57P01"].includes(code)) {
    return true;
  }
  return (
    message.includes("connection terminated unexpectedly") ||
    message.includes("server closed the connection unexpectedly") ||
    message.includes("connection reset") ||
    message.includes("connection ended unexpectedly") ||
    message.includes("timeout")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildConfig(prefix) {
  return {
    host: process.env[`${prefix}_HOST`],
    port: Number(process.env[`${prefix}_PORT`] || 5432),
    user: process.env[`${prefix}_USER`],
    password: process.env[`${prefix}_PASS`] || process.env[`${prefix}_PASSWORD`],
    database: process.env[`${prefix}_NAME`],
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  };
}

function makeClient(config, label) {
  const client = new Client(config);
  client.on("error", (error) => {
    console.warn(`${label} connection warning: ${error.message}`);
  });
  return client;
}

async function ensureMediaChunkTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.cms_media_file_chunks (
      media_id INTEGER NOT NULL REFERENCES public.cms_media(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_bytes BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (media_id, chunk_index)
    )
  `);
}

async function main() {
  const sourceConfig = buildConfig("AZURE_DB");
  const targetConfig = buildConfig("RENDER_DB");

  let sourceClient = makeClient(sourceConfig, "Azure source");
  let targetClient = makeClient(targetConfig, "Render target");

  async function reconnectSource() {
    for (let attempt = 1; ; attempt += 1) {
      await Promise.allSettled([sourceClient.end()]);
      sourceClient = makeClient(sourceConfig, "Azure source");
      try {
        await sourceClient.connect();
        return;
      } catch (error) {
        await Promise.allSettled([sourceClient.end()]);
        if (!isTransientConnectionError(error) || attempt >= RETRIES) {
          throw error;
        }
        console.warn(`Reconnect Azure source failed (${attempt}/${RETRIES}), retrying...`);
        await sleep(500 * attempt);
      }
    }
  }

  async function reconnectTarget() {
    for (let attempt = 1; ; attempt += 1) {
      await Promise.allSettled([targetClient.end()]);
      targetClient = makeClient(targetConfig, "Render target");
      try {
        await targetClient.connect();
        return;
      } catch (error) {
        await Promise.allSettled([targetClient.end()]);
        if (!isTransientConnectionError(error) || attempt >= RETRIES) {
          throw error;
        }
        console.warn(`Reconnect Render target failed (${attempt}/${RETRIES}), retrying...`);
        await sleep(500 * attempt);
      }
    }
  }

  async function withRetry(label, fn, reconnect) {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt += 1;
        if (!isTransientConnectionError(error) || attempt > RETRIES) {
          throw new Error(`${label}: ${error.message}`);
        }
        console.warn(`${label}: transient error (${attempt}/${RETRIES}), retrying...`);
        if (reconnect) {
          await reconnect();
        }
        await sleep(500 * attempt);
      }
    }
  }

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const mediaFilters = [];
    const mediaParams = [];
    if (Number.isFinite(MIN_ID) && MIN_ID > 0) {
      mediaParams.push(MIN_ID);
      mediaFilters.push(`id >= $${mediaParams.length}`);
    }
    if (Number.isFinite(MAX_ID) && MAX_ID > 0) {
      mediaParams.push(MAX_ID);
      mediaFilters.push(`id <= $${mediaParams.length}`);
    }
    const mediaWhereSql = mediaFilters.length ? `WHERE ${mediaFilters.join(" AND ")}` : "";

    const { rows: mediaMetaRows } = await withRetry(
      BYTES_ONLY ? "Fetch Azure media ids" : "Fetch Azure media metadata",
      () =>
        sourceClient.query(
          `
          SELECT
            id${BYTES_ONLY
              ? ""
              : `, file_name, original_name, mime_type, category, size_bytes,
            alt_text, caption_text_color, storage_path, uploaded_by, created_at, album_id`}
          FROM public.cms_media
          ${mediaWhereSql}
          ORDER BY id
        `,
          mediaParams,
        ),
      reconnectSource,
    );

    const albumRows = BYTES_ONLY
      ? []
      : (
          await withRetry(
            "Fetch Azure albums",
            () =>
              sourceClient.query(`
                SELECT
                  id, name, slug, description, sort_order, cover_media_id, created_at, updated_at
                FROM public.cms_media_albums
                ORDER BY id
              `),
            reconnectSource,
          )
        ).rows;

    console.log(`Azure media rows: ${mediaMetaRows.length}`);
    console.log(`Azure album rows: ${albumRows.length}`);

    if (!BYTES_ONLY) {
      await withRetry("Begin target transaction", () => targetClient.query("BEGIN"), reconnectTarget);
      await withRetry(
        "Defer constraints",
        () => targetClient.query("SET CONSTRAINTS ALL DEFERRED"),
        reconnectTarget,
      );

      await withRetry(
        "Truncate target media tables",
        () =>
          targetClient.query(
            'TRUNCATE TABLE public."cms_media", public."cms_media_albums" RESTART IDENTITY CASCADE',
          ),
        reconnectTarget,
      );

      for (const row of albumRows) {
        await withRetry(
          `Upsert album ${row.id}`,
          () =>
            targetClient.query(
              `
                INSERT INTO public.cms_media_albums
                  (id, name, slug, description, sort_order, cover_media_id, created_at, updated_at)
                VALUES
                  ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  slug = EXCLUDED.slug,
                  description = EXCLUDED.description,
                  sort_order = EXCLUDED.sort_order,
                  cover_media_id = EXCLUDED.cover_media_id,
                  created_at = EXCLUDED.created_at,
                  updated_at = EXCLUDED.updated_at
              `,
              [
                row.id,
                row.name,
                row.slug,
                row.description,
                row.sort_order,
                row.cover_media_id,
                row.created_at,
                row.updated_at,
              ],
            ),
          reconnectTarget,
        );
      }

      for (const row of mediaMetaRows) {
        await withRetry(
          `Upsert media metadata ${row.id}`,
          () =>
            targetClient.query(
              `
                INSERT INTO public.cms_media
                  (id, file_name, original_name, mime_type, category, size_bytes, alt_text,
                   caption_text_color, storage_path, uploaded_by, created_at, album_id, file_bytes)
                VALUES
                  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL)
                ON CONFLICT (id) DO UPDATE SET
                  file_name = EXCLUDED.file_name,
                  original_name = EXCLUDED.original_name,
                  mime_type = EXCLUDED.mime_type,
                  category = EXCLUDED.category,
                  size_bytes = EXCLUDED.size_bytes,
                  alt_text = EXCLUDED.alt_text,
                  caption_text_color = EXCLUDED.caption_text_color,
                  storage_path = EXCLUDED.storage_path,
                  uploaded_by = EXCLUDED.uploaded_by,
                  created_at = EXCLUDED.created_at,
                  album_id = EXCLUDED.album_id
              `,
              [
                row.id,
                row.file_name,
                row.original_name,
                row.mime_type,
                row.category,
                row.size_bytes,
                row.alt_text,
                row.caption_text_color,
                row.storage_path,
                row.uploaded_by,
                row.created_at,
                row.album_id,
              ],
            ),
          reconnectTarget,
        );
      }

      await withRetry("Commit metadata transaction", () => targetClient.query("COMMIT"), reconnectTarget);
      console.log("Metadata copy committed. Copying file_bytes in chunks...");
    } else {
      console.log("Bytes-only mode enabled. Updating existing Render media rows.");
    }

    for (let index = 0; index < mediaMetaRows.length; index += 1) {
      const id = mediaMetaRows[index].id;

      const { rows } = await withRetry(
        `Fetch Azure file_bytes ${id}`,
        () => sourceClient.query("SELECT file_bytes FROM public.cms_media WHERE id = $1", [id]),
        reconnectSource,
      );
      const fileBytes = rows[0]?.file_bytes || null;

      await withRetry(
        `Reset target file_bytes ${id}`,
        () => targetClient.query("UPDATE public.cms_media SET file_bytes = NULL WHERE id = $1", [id]),
        reconnectTarget,
      );

      if (!fileBytes || !fileBytes.length) {
        console.log(`file_bytes ${index + 1}/${mediaMetaRows.length} id=${id}: 0 bytes`);
        continue;
      }

      console.log(
        `file_bytes ${index + 1}/${mediaMetaRows.length} id=${id}: copying ${fileBytes.length} bytes`,
      );

      if (STORE_LARGE_AS_CHUNKS && fileBytes.length >= DIRECT_UPDATE_THRESHOLD_BYTES) {
        await withRetry(
          "Ensure media chunk table",
          () => ensureMediaChunkTable(targetClient),
          reconnectTarget,
        );
        const existingChunkIndexes = new Set();
        if (RESUME_CHUNKS) {
          const { rows: existingRows } = await withRetry(
            `Fetch existing chunks ${id}`,
            () =>
              targetClient.query(
                "SELECT chunk_index FROM public.cms_media_file_chunks WHERE media_id = $1",
                [id],
              ),
            reconnectTarget,
          );
          for (const row of existingRows) {
            existingChunkIndexes.add(Number(row.chunk_index));
          }
          console.log(`file_bytes id=${id}: resuming with ${existingChunkIndexes.size} chunks`);
        } else {
          await withRetry(
            `Delete existing chunks ${id}`,
            () =>
              targetClient.query("DELETE FROM public.cms_media_file_chunks WHERE media_id = $1", [
                id,
              ]),
            reconnectTarget,
          );
        }

        let chunkIndex = 0;
        for (let offset = 0; offset < fileBytes.length; offset += CHUNK_SIZE) {
          const chunk = fileBytes.subarray(offset, Math.min(offset + CHUNK_SIZE, fileBytes.length));
          if (existingChunkIndexes.has(chunkIndex)) {
            chunkIndex += 1;
            continue;
          }
          console.log(
            `file_bytes id=${id}: store chunk ${chunkIndex} ${offset}-${
              offset + chunk.length
            }/${fileBytes.length}`,
          );
          await withRetry(
            `Store chunk ${id} #${chunkIndex}`,
            () =>
              targetClient.query(
                `
                  INSERT INTO public.cms_media_file_chunks (media_id, chunk_index, chunk_bytes)
                  VALUES ($1, $2, $3)
                  ON CONFLICT (media_id, chunk_index)
                  DO UPDATE SET chunk_bytes = EXCLUDED.chunk_bytes, created_at = NOW()
                `,
                [id, chunkIndex, chunk],
              ),
            reconnectTarget,
          );
          chunkIndex += 1;
        }

        console.log(
          `file_bytes ${index + 1}/${mediaMetaRows.length} id=${id}: ${fileBytes.length} bytes in ${chunkIndex} chunks`,
        );
        continue;
      }

      if (fileBytes.length >= DIRECT_UPDATE_THRESHOLD_BYTES) {
        await withRetry(
          `Direct update file_bytes ${id}`,
          () =>
            targetClient.query("UPDATE public.cms_media SET file_bytes = $1 WHERE id = $2", [
              fileBytes,
              id,
            ]),
          reconnectTarget,
        );
        console.log(
          `file_bytes ${index + 1}/${mediaMetaRows.length} id=${id}: ${fileBytes.length} bytes`,
        );
        continue;
      }

      await withRetry(
        `Initialize target bytea ${id}`,
        () =>
          targetClient.query(
            "UPDATE public.cms_media SET file_bytes = ''::bytea WHERE id = $1",
            [id],
          ),
        reconnectTarget,
      );

      for (let offset = 0; offset < fileBytes.length; offset += CHUNK_SIZE) {
        const chunk = fileBytes.subarray(offset, Math.min(offset + CHUNK_SIZE, fileBytes.length));
        if (fileBytes.length > CHUNK_SIZE * 4) {
          console.log(
            `file_bytes id=${id}: chunk ${offset}-${offset + chunk.length}/${fileBytes.length}`,
          );
        }
        await withRetry(
          `Append chunk ${id} @${offset}`,
          () =>
            targetClient.query(
              "UPDATE public.cms_media SET file_bytes = file_bytes || $1::bytea WHERE id = $2",
              [chunk, id],
            ),
          reconnectTarget,
        );
      }

      console.log(
        `file_bytes ${index + 1}/${mediaMetaRows.length} id=${id}: ${fileBytes.length} bytes`,
      );
    }

    const { rows: verifyRows } = await withRetry(
      "Verify target media counts",
      () =>
        targetClient.query(`
          SELECT
            (SELECT count(1)::int FROM public.cms_media_albums) AS albums_count,
            (SELECT count(1)::int FROM public.cms_media) AS media_count,
            (SELECT max(octet_length(file_bytes))::bigint FROM public.cms_media) AS max_file_bytes
        `),
      reconnectTarget,
    );
    console.log("Media sync completed:", verifyRows[0]);
  } finally {
    await Promise.allSettled([sourceClient.end(), targetClient.end()]);
  }
}

main().catch((error) => {
  console.error("Media sync failed:", error.message);
  process.exitCode = 1;
});
