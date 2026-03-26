import { pool } from "../models/db.js";

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  link: row.link,
  publishedAt: row.published_at,
  createdAt: row.created_at
});

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS whats_new (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      published_at TIMESTAMP DEFAULT now(),
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_whats_new_published ON whats_new (published_at DESC, id DESC);
  `);

  // Allow drafts by permitting NULL published_at.
  await client.query(`ALTER TABLE whats_new ALTER COLUMN published_at DROP NOT NULL;`);

  // Debug: log total rows in whats_new to help diagnose missing items
  try {
    const { rows: countRows } = await client.query(`SELECT count(*)::int AS cnt FROM whats_new`);
    console.debug("whats-new: table row count", countRows?.[0]?.cnt ?? 0);
  } catch (e) {
    /* ignore */
  }
}

export async function list(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));
  const client = await pool.connect();
  try {
    await ensureTable(client);
    // Debug: log request so we can trace 403/empty responses seen in browser
    try {
      console.debug("whats-new: request", { query: req.query, ip: req.ip, headers: req.headers?.host });
    } catch (e) {
      /* ignore logging errors */
    }
    // Return all items for the public endpoint (admin saves should appear).
    // Note: earlier attempts to filter by `published_at <= now()` can hide
    // items due to timestamp vs timestamptz/timezone handling. We return
    // all items here and rely on the admin UI to control visibility.
    const { rows } = await client.query(
      `SELECT id, title, description, link, published_at, created_at
         FROM whats_new
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT $1`,
      [limit]
    );
    try {
      console.debug(`whats-new: returned ${rows.length} rows`);
    } catch (e) {
      /* ignore logging errors */
    }
    res.json({ data: rows.map(mapRow) });
  } finally {
    client.release();
  }
}

export async function adminList(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, 500));
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query(
      `SELECT id, title, description, link, published_at, created_at
         FROM whats_new
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT $1`,
      [limit]
    );
    res.json({ data: rows.map(mapRow) });
  } finally {
    client.release();
  }
}

export async function create(req, res) {
  const { title, description, link, publishedAt } = req.body;
  const role = (req.user?.role || "").toLowerCase();
  const effectivePublishedAt = role === "author" ? null : (publishedAt || new Date());

  const client = await pool.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query(
      `INSERT INTO whats_new (title, description, link, published_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, link, published_at, created_at`,
      [title, description || null, link || null, effectivePublishedAt]
    );
    res.status(201).json({ data: mapRow(rows[0]) });
  } finally {
    client.release();
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `DELETE FROM whats_new WHERE id = $1
       RETURNING id, title, description, link, published_at, created_at`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: mapRow(rows[0]) });
  } finally {
    client.release();
  }
}
