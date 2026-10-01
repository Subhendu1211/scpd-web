import { pool } from "../models/db.js";

/**
 * List all success stories, optionally filtered by year.
 */
export async function listSuccessStories(year) {
  const client = await pool.connect();
  try {
    let query = `
            SELECT id, year, image_url, alt_text, uploaded_by, created_at
            FROM success_stories
        `;
    const params = [];

    if (year) {
      query += ` WHERE year = $1`;
      params.push(Number(year));
    }

    query += ` ORDER BY year DESC, id DESC`;

    try {
      const { rows } = await client.query(query, params);
      return rows.map(mapRow);
    } catch (err) {
      // If the table doesn't exist yet, return empty list instead of throwing.
      // PostgreSQL undefined_table code is '42P01'. Be defensive for other errors.
      // eslint-disable-next-line no-console
      if (err && err.code === "42P01") {
        console.warn("success_stories table missing - returning empty list");
        return [];
      }
      // Re-throw other unexpected DB errors so upstream can handle/log them.
      throw err;
    }
  } finally {
    client.release();
  }
}

/**
 * Get distinct years that have success stories.
 */
export async function listSuccessStoryYears() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT DISTINCT year FROM success_stories ORDER BY year DESC`,
    );
    return rows.map((r) => r.year);
  } finally {
    client.release();
  }
}

/**
 * Create a new success story entry.
 */
export async function createSuccessStory({
  year,
  imageUrl,
  altText,
  uploadedBy,
}) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO success_stories (year, image_url, alt_text, uploaded_by)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id, year, image_url, alt_text, uploaded_by, created_at`,
      [year, imageUrl, altText || null, uploadedBy || null],
    );
    return mapRow(rows[0]);
  } finally {
    client.release();
  }
}

/**
 * Delete a success story by id.
 */
export async function deleteSuccessStory(id) {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      `DELETE FROM success_stories WHERE id = $1`,
      [id],
    );
    return rowCount > 0;
  } finally {
    client.release();
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    year: row.year,
    imageUrl: row.image_url,
    altText: row.alt_text,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}
