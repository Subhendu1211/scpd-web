import { promises as fs } from "fs";
import path from "path";
import { pool } from "../models/db.js";

const NEWS_UPLOAD_PREFIX = "/uploads/news/";
const newsStorageRoot = path.resolve(process.cwd(), "uploads", "news");

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  publishedAt: row.published_at,
  imageUrl: row.image_url || null,
});

async function ensureNewsUploadDirectory() {
  await fs.mkdir(newsStorageRoot, { recursive: true });
}

function getSafeImageExtension(originalName = "") {
  const ext = path.extname(originalName);
  return ext && /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : "";
}

async function persistUploadedNewsImage(file) {
  if (!file) {
    return null;
  }
  await ensureNewsUploadDirectory();
  const safeExt = getSafeImageExtension(file.originalname || "");
  const finalFileName = `${file.filename}${safeExt}`;
  const absolutePath = path.resolve(newsStorageRoot, finalFileName);
  await fs.rename(file.path, absolutePath);
  return `${NEWS_UPLOAD_PREFIX}${finalFileName}`;
}

function resolveNewsImageAbsolutePath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }
  if (!imageUrl.startsWith(NEWS_UPLOAD_PREFIX)) {
    return null;
  }
  const fileName = path.basename(imageUrl);
  if (!fileName) {
    return null;
  }
  return path.resolve(newsStorageRoot, fileName);
}

async function removeNewsImageFile(imageUrl) {
  const absolutePath = resolveNewsImageAbsolutePath(imageUrl);
  if (!absolutePath) {
    return;
  }
  await fs.unlink(absolutePath).catch(() => {});
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseRemoveImageFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value === "true";
  }
  return false;
}

async function ensureNewsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      image_url TEXT,
      published_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  // Allow drafts by permitting NULL published_at.
  await client.query(
    `ALTER TABLE news ALTER COLUMN published_at DROP NOT NULL;`,
  );

  await client.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS body TEXT;`);
  await client.query(
    `ALTER TABLE news ADD COLUMN IF NOT EXISTS image_url TEXT;`,
  );
}

export async function list(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));
  const client = await pool.connect();
  try {
    await ensureNewsTable(client);
    const { rows } = await client.query(
      `SELECT id, title, body, image_url, published_at
         FROM news
        WHERE published_at IS NOT NULL
        ORDER BY published_at DESC, id DESC
        LIMIT $1`,
      [limit],
    );
    res.json({ data: rows.map(mapRow) });
  } finally {
    client.release();
  }
}

export async function adminList(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, 500));
  const client = await pool.connect();
  try {
    await ensureNewsTable(client);
    const { rows } = await client.query(
      `SELECT id, title, body, image_url, published_at
         FROM news
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT $1`,
      [limit],
    );
    res.json({ data: rows.map(mapRow) });
  } finally {
    client.release();
  }
}

export async function create(req, res) {
  const { title, body, publishedAt } = req.body;
  const role = (req.user?.role || "").toLowerCase();
  const effectivePublishedAt =
    role === "author" ? null : publishedAt || new Date();
  const manualImageUrl =
    typeof req.body.imageUrl === "string" && req.body.imageUrl.trim()
      ? req.body.imageUrl.trim()
      : null;

  const client = await pool.connect();
  let uploadedImageUrl = null;
  try {
    await ensureNewsTable(client);
    uploadedImageUrl = await persistUploadedNewsImage(req.file);
    const imageUrl = uploadedImageUrl || manualImageUrl;

    const { rows } = await client.query(
      `INSERT INTO news (title, body, image_url, published_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, body, image_url, published_at`,
      [title, body, imageUrl, effectivePublishedAt],
    );
    res.status(201).json({ data: mapRow(rows[0]) });
  } catch (error) {
    if (uploadedImageUrl) {
      await removeNewsImageFile(uploadedImageUrl);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `DELETE FROM news
       WHERE id = $1
       RETURNING id, title, body, image_url, published_at`,
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Not found" });
    }
    await removeNewsImageFile(rows[0].image_url);
    res.json({ data: mapRow(rows[0]) });
  } finally {
    client.release();
  }
}
export async function update(req, res) {
  const { id } = req.params;
  const { title, body, publishedAt } = req.body;
  const removeImage = parseRemoveImageFlag(req.body.removeImage);
  const explicitImageUrl =
    typeof req.body.imageUrl === "string" ? req.body.imageUrl.trim() : undefined;

  const client = await pool.connect();
  let newUploadedImageUrl = null;
  try {
    await ensureNewsTable(client);
    const existingResult = await client.query(
      `SELECT id, title, body, image_url, published_at
         FROM news
        WHERE id = $1`,
      [id],
    );
    if (!existingResult.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }
    const existing = existingResult.rows[0];

    newUploadedImageUrl = await persistUploadedNewsImage(req.file);

    let nextImageUrl = existing.image_url;
    if (newUploadedImageUrl) {
      nextImageUrl = newUploadedImageUrl;
    } else if (removeImage) {
      nextImageUrl = null;
    } else if (explicitImageUrl !== undefined) {
      nextImageUrl = explicitImageUrl || null;
    }

    const nextTitle = hasOwn(req.body, "title") ? title : existing.title;
    const nextBody = hasOwn(req.body, "body") ? body : existing.body;
    const nextPublishedAt = hasOwn(req.body, "publishedAt")
      ? (publishedAt || null)
      : existing.published_at;

    const { rows } = await client.query(
      `UPDATE news
       SET title = $1,
           body = $2,
           image_url = $3,
           published_at = $4
       WHERE id = $5
       RETURNING id, title, body, image_url, published_at`,
      [nextTitle, nextBody, nextImageUrl, nextPublishedAt, id],
    );

    if (rows.length) {
      const previousImageUrl = existing.image_url;
      const currentImageUrl = rows[0].image_url;
      if (previousImageUrl && previousImageUrl !== currentImageUrl) {
        await removeNewsImageFile(previousImageUrl);
      }
    }

    res.json({ data: mapRow(rows[0]) });
  } catch (error) {
    if (newUploadedImageUrl) {
      await removeNewsImageFile(newUploadedImageUrl);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getById(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, title, body, image_url, published_at 
         FROM news 
        WHERE id = $1 AND published_at IS NOT NULL`,
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: mapRow(rows[0]) });
  } finally {
    client.release();
  }
}
