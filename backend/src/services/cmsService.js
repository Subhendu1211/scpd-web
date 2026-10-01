import { pool } from "../models/db.js";
import { listOrgUnits } from "./adminOrgChartService.js";

async function ensurePageStyleTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_page_tables (
      menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
      table_name TEXT NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_page_styles (
      menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
      font_family TEXT,
      font_color TEXT,
      background_color TEXT,
      page_layout TEXT,
      show_publish_date BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await client.query(`
    ALTER TABLE cms_page_styles
      ADD COLUMN IF NOT EXISTS show_publish_date BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

async function ensureMenuImageColumn(client) {
  await client.query(`
    ALTER TABLE cms_menu_items
      ADD COLUMN IF NOT EXISTS image_path TEXT;
  `);
}

async function ensureFooterLinksTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_footer_links (
      menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
      section TEXT NOT NULL,
      link_label TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT cms_footer_links_section_check CHECK (section IN ('contact', 'policies', 'governance'))
    );
  `);
}

/**
 * Fetch hierarchical navigation tree from cms_menu_items.
 * Returns an array of parent items with nested children sorted by sort_order.
 */
export async function fetchNavigationTree() {
  const client = await pool.connect();
  try {
    await ensureMenuImageColumn(client);
    const query = `
      SELECT
        id,
        parent_id,
        label,
        slug,
        path,
        description,
        image_path,
        sort_order,
        is_active
      FROM cms_menu_items
      WHERE is_active = TRUE
      ORDER BY parent_id NULLS FIRST, sort_order, label
    `;

    const { rows } = await client.query(query);
    const nodes = new Map();

    rows.forEach((row) => {
      nodes.set(row.id, {
        id: row.id,
        label: row.label,
        slug: row.slug,
        path: row.path,
        description: row.description,
        imagePath: row.image_path,
        sortOrder: row.sort_order,
        children: [],
      });
    });

    const root = [];

    rows.forEach((row) => {
      const node = nodes.get(row.id);
      if (!node) {
        return;
      }

      if (!row.parent_id) {
        root.push(node);
        return;
      }

      const parent = nodes.get(row.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    });

    const sortItems = (items) => {
      items.sort((a, b) => {
        if (a.sortOrder === b.sortOrder) {
          return a.label.localeCompare(b.label);
        }
        return a.sortOrder - b.sortOrder;
      });
      items.forEach((child) => sortItems(child.children));
    };

    sortItems(root);

    return root;
  } finally {
    client.release();
  }
}

/**
 * Retrieve a published page by slug or path.
 * @param {{ slug?: string, path?: string }} params
 */
export async function fetchPage(params) {
  const { slug = null, path = null, lang = "en" } = params || {};
  if (!slug && !path) {
    throw new Error("Either slug or path is required");
  }
  if (slug && path) {
    throw new Error("Provide only one of slug or path, not both");
  }

  const normalizedLang =
    typeof lang === "string" && lang.toLowerCase() === "or" ? "or" : "en";

  const client = await pool.connect();
  try {
    await ensurePageStyleTable(client);
    const { rows } = await client.query(
      `
        SELECT
          p.id,
          p.title AS "titleEn",
          p.summary AS "summaryEn",
          p.body AS "bodyEn",
          p.title_or AS "titleOr",
          p.summary_or AS "summaryOr",
          p.body_or AS "bodyOr",
          p.hero_image_path AS "heroImagePath",
          p.hero_image_paths AS "heroImagePaths",
          p.hero_image_captions AS "heroImageCaptions",
          p.attachments_paths AS "attachmentsPaths",
          p.attachments_captions AS "attachmentsCaptions",
          p.published_at AS "publishedAt",
          p.updated_at AS "updatedAt",
          m.label,
          m.slug,
          m.path,
          t.table_name AS "dynamicTableName",
          s.font_family AS "fontFamily",
          s.font_color AS "fontColor",
          s.background_color AS "backgroundColor",
          s.page_layout AS "pageLayout",
          COALESCE(s.show_publish_date, FALSE) AS "showPublishDate"
        FROM cms_pages p
        JOIN cms_menu_items m ON m.id = p.menu_item_id
        LEFT JOIN cms_page_tables t ON t.menu_item_id = p.menu_item_id
        LEFT JOIN cms_page_styles s ON s.menu_item_id = p.menu_item_id
        WHERE p.status = 'published'
          AND (
            ($1::text IS NOT NULL AND m.slug = $1::text)
            OR ($2::text IS NOT NULL AND m.path = $2::text)
          )
        ORDER BY p.published_at DESC NULLS LAST, p.updated_at DESC NULLS LAST
        LIMIT 1
      `,
      [slug, path],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }

    const localizedTitle =
      normalizedLang === "or" ? row.titleOr || row.titleEn : row.titleEn;
    const localizedSummary =
      normalizedLang === "or"
        ? (row.summaryOr ?? row.summaryEn)
        : row.summaryEn;
    const localizedBody =
      normalizedLang === "or" ? (row.bodyOr ?? row.bodyEn) : row.bodyEn;
    const normalizedTitle = localizedTitle ?? null;
    const normalizedSummary = localizedSummary ?? null;
    const normalizedBody = localizedBody ?? "";

    return {
      id: row.id,
      title: normalizedTitle,
      summary: normalizedSummary,
      body: normalizedBody,
      heroImagePath: row.heroImagePath,
      heroImagePaths:
        row.heroImagePaths && row.heroImagePaths.length > 0
          ? row.heroImagePaths
          : row.heroImagePath
            ? [row.heroImagePath]
            : [],
      heroImageCaptions: row.heroImageCaptions || [],
      attachmentsPaths: row.attachmentsPaths || [],
      attachmentsCaptions: row.attachmentsCaptions || [],
      commonAttachmentsCaption: row.commonAttachmentsCaption || null,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      label: row.label,
      slug: row.slug,
      path: row.path,
      titleEn: row.titleEn,
      summaryEn: row.summaryEn,
      bodyEn: row.bodyEn,
      titleOr: row.titleOr,
      summaryOr: row.summaryOr,
      bodyOr: row.bodyOr,
      language: normalizedLang,
      dynamicTableName: row.dynamicTableName || null,
      showPublishDate: Boolean(row.showPublishDate),
    };
  } finally {
    client.release();
  }
}

export async function fetchMediaByCategory(category) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT m.id,
              m.file_name AS "filename",
              m.original_name AS "originalName",
              m.mime_type AS "mimeType",
              m.category,
              m.size_bytes AS "sizeBytes",
              m.alt_text AS "altText",
              m.caption_text_color AS "captionTextColor",
              m.created_at AS "createdAt",
              m.album_id AS "albumId",
              a.name AS "albumName",
              a.slug AS "albumSlug",
              a.description AS "albumDescription",
              a.sort_order AS "albumSortOrder"
         FROM cms_media m
         LEFT JOIN cms_media_albums a ON a.id = m.album_id
        WHERE m.category = $1
        ORDER BY a.sort_order NULLS LAST, m.created_at DESC`,
      [category],
    );

    return rows.map((row) => ({
      ...row,
      url: `/uploads/media/${row.filename}`,
    }));
  } finally {
    client.release();
  }
}

export async function fetchOrgChartTree() {
  return listOrgUnits({ activeOnly: true });
}

export async function fetchFooterLinks() {
  const client = await pool.connect();
  try {
    await ensureFooterLinksTable(client);
    const { rows } = await client.query(
      `SELECT
         fl.section AS "section",
         COALESCE(NULLIF(fl.link_label, ''), m.label, p.title) AS "label",
         m.path AS "path",
         fl.sort_order AS "sortOrder"
       FROM cms_footer_links fl
       JOIN cms_menu_items m ON m.id = fl.menu_item_id
       JOIN cms_pages p ON p.menu_item_id = fl.menu_item_id
       WHERE fl.is_active = TRUE
         AND p.status = 'published'
       ORDER BY fl.section, fl.sort_order, m.path`
    );

    return rows;
  } finally {
    client.release();
  }
}
