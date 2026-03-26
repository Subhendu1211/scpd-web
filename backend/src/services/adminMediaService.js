import { promises as fs } from "fs";
import path from "path";
import { pool } from "../models/db.js";

const uploadRoot = path.resolve(process.cwd(), "uploads", "media");

export const mediaStorageRoot = uploadRoot;

const MEDIA_SELECT_FIELDS = `
	m.id,
	m.file_name,
	m.original_name,
	m.mime_type,
	m.category,
	m.size_bytes,
	m.alt_text,
	m.caption_text_color,
	m.storage_path,
	m.uploaded_by,
	m.created_at,
	m.album_id,
	a.name AS album_name,
	a.slug AS album_slug,
	a.description AS album_description,
	a.sort_order AS album_sort_order
`;

function mapRowToMediaItem(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    filename: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    category: row.category,
    sizeBytes: row.size_bytes,
    altText: row.alt_text,
    captionTextColor: row.caption_text_color,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    url: `/uploads/media/${row.file_name}`,
    storagePath: row.storage_path,
    albumId:
      row.album_id === null || row.album_id === undefined
        ? null
        : Number(row.album_id),
    albumName: row.album_name || null,
    albumSlug: row.album_slug || null,
    albumDescription: row.album_description || null,
    albumSortOrder:
      row.album_sort_order === null || row.album_sort_order === undefined
        ? null
        : Number(row.album_sort_order),
  };
}

function mapRowToAlbum(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder:
      row.sort_order === null || row.sort_order === undefined
        ? 0
        : Number(row.sort_order),
    coverMediaId:
      row.cover_media_id === null || row.cover_media_id === undefined
        ? null
        : Number(row.cover_media_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mediaCount: Number(row.media_count ?? 0),
  };
}

function slugify(value) {
  const base = (value || "album")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "album";
}

async function generateUniqueAlbumSlug(client, name) {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await client.query(
      `SELECT 1 FROM cms_media_albums WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (!rows.length) {
      return slug;
    }
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

async function fetchMediaById(client, id) {
  const { rows } = await client.query(
    `SELECT ${MEDIA_SELECT_FIELDS}
			 FROM cms_media m
			 LEFT JOIN cms_media_albums a ON a.id = m.album_id
			WHERE m.id = $1`,
    [id],
  );
  return mapRowToMediaItem(rows[0]);
}

async function fetchAlbumById(client, id) {
  const { rows } = await client.query(
    `SELECT a.id,
						a.name,
						a.slug,
						a.description,
						a.sort_order,
						a.cover_media_id,
						a.created_at,
						a.updated_at,
						COUNT(m.id) AS media_count
			 FROM cms_media_albums a
			 LEFT JOIN cms_media m ON m.album_id = a.id
			WHERE a.id = $1
			GROUP BY a.id`,
    [id],
  );
  return mapRowToAlbum(rows[0]);
}

export async function listMedia() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT ${MEDIA_SELECT_FIELDS}
				 FROM cms_media m
				 LEFT JOIN cms_media_albums a ON a.id = m.album_id
				ORDER BY m.created_at DESC`,
    );
    return rows.map(mapRowToMediaItem);
  } finally {
    client.release();
  }
}

export async function createMediaRecord({
  fileName,
  originalName,
  mimeType,
  category,
  sizeBytes,
  storagePath,
  fileBytes,
  altText,
  captionTextColor,
  uploadedBy,
  albumId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO cms_media (file_name, original_name, mime_type, category, size_bytes, storage_path, file_bytes, alt_text, uploaded_by, album_id, caption_text_color)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			 RETURNING id`,
      [
        fileName,
        originalName,
        mimeType,
        category,
        sizeBytes,
        storagePath,
        fileBytes || null,
        altText || null,
        uploadedBy || null,
        albumId || null,
        category === "carousel" ? captionTextColor || null : null,
      ],
    );
    const media = await fetchMediaById(client, rows[0].id);
    await client.query("COMMIT");
    return media;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function fetchMediaBinaryByFileName(fileName) {
  if (!fileName) return null;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT mime_type, file_bytes
				 FROM cms_media
				WHERE file_name = $1
				LIMIT 1`,
      [fileName],
    );

    if (!rows.length) return null;
    const row = rows[0];
    if (!row.file_bytes) return null;
    return {
      mimeType: row.mime_type,
      fileBytes: row.file_bytes,
    };
  } finally {
    client.release();
  }
}

export async function fetchMediaByCategory(category) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT ${MEDIA_SELECT_FIELDS}
				 FROM cms_media m
				 LEFT JOIN cms_media_albums a ON a.id = m.album_id
				WHERE m.category = $1
				ORDER BY a.sort_order NULLS LAST, m.created_at DESC`,
      [category],
    );
    return rows.map(mapRowToMediaItem);
  } finally {
    client.release();
  }
}

export async function updateMediaRecord(
  id,
  { altText, albumId, captionTextColor, category },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await fetchMediaById(client, id);
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    const updates = [];
    const values = [];

    if (altText !== undefined) {
      values.push(altText === null || altText === "" ? null : altText);
      updates.push(`alt_text = $${values.length}`);
    }

    if (albumId !== undefined) {
      values.push(albumId === null ? null : albumId);
      updates.push(`album_id = $${values.length}`);
    }

    if (captionTextColor !== undefined) {
      values.push(
        captionTextColor === null || captionTextColor === ""
          ? null
          : captionTextColor,
      );
      updates.push(`caption_text_color = $${values.length}`);
    }

    if (category !== undefined) {
      values.push(category);
      updates.push(`category = $${values.length}`);
    }

    if (updates.length) {
      await client.query(
        `UPDATE cms_media SET ${updates.join(", ")} WHERE id = $${values.length + 1}`,
        [...values, id],
      );
    }

    const media = await fetchMediaById(client, id);
    await client.query("COMMIT");
    return media;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMediaRecord(id) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `DELETE FROM cms_media WHERE id = $1 RETURNING storage_path`,
      [id],
    );

    if (!rows.length) {
      return false;
    }

    const storagePath = rows[0].storage_path;
    const absolutePath = path.resolve(storagePath);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    return true;
  } finally {
    client.release();
  }
}

export async function listMediaAlbums() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT a.id,
							a.name,
							a.slug,
							a.description,
							a.sort_order,
							a.cover_media_id,
							a.created_at,
							a.updated_at,
							COUNT(m.id) AS media_count
				 FROM cms_media_albums a
				 LEFT JOIN cms_media m ON m.album_id = a.id
				GROUP BY a.id
				ORDER BY a.sort_order, a.name`,
    );
    return rows.map(mapRowToAlbum);
  } finally {
    client.release();
  }
}

export async function createMediaAlbum({
  name,
  description,
  sortOrder = 0,
  coverMediaId = null,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const slug = await generateUniqueAlbumSlug(client, name);
    const { rows } = await client.query(
      `INSERT INTO cms_media_albums (name, slug, description, sort_order, cover_media_id)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id`,
      [name, slug, description || null, sortOrder, coverMediaId],
    );
    const album = await fetchAlbumById(client, rows[0].id);
    await client.query("COMMIT");
    return album;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMediaAlbum(
  id,
  { name, description, sortOrder, coverMediaId },
) {
  const client = await pool.connect();
  try {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (description !== undefined) {
      values.push(description || null);
      updates.push(`description = $${values.length}`);
    }

    if (sortOrder !== undefined) {
      values.push(sortOrder);
      updates.push(`sort_order = $${values.length}`);
    }

    if (coverMediaId !== undefined) {
      values.push(coverMediaId);
      updates.push(`cover_media_id = $${values.length}`);
    }

    if (updates.length) {
      updates.push("updated_at = now()");
      await client.query(
        `UPDATE cms_media_albums SET ${updates.join(", ")} WHERE id = $${values.length + 1}`,
        [...values, id],
      );
    }

    const album = await fetchAlbumById(client, id);
    return album;
  } finally {
    client.release();
  }
}

export async function deleteMediaAlbum(id) {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      `DELETE FROM cms_media_albums WHERE id = $1`,
      [id],
    );
    return rowCount > 0;
  } finally {
    client.release();
  }
}
