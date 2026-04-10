import { pool } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveInitSqlPath() {
  const candidates = [
    // Monorepo layout: backend/src/models -> repo/infra/db/init.sql
    path.resolve(__dirname, "../../../infra/db/init.sql"),
    // Optional deployed layout fallback if infra is copied near backend
    path.resolve(__dirname, "../../infra/db/init.sql"),
    // Optional local fallback if init is bundled into backend/db
    path.resolve(__dirname, "../../db/init.sql"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function ensurePublishedCmsPages(client) {
  const { rows } = await client.query(
    `SELECT
			to_regclass('public.cms_menu_items') IS NOT NULL AS has_menu,
			to_regclass('public.cms_pages') IS NOT NULL AS has_pages`,
  );

  const hasMenu = Boolean(rows?.[0]?.has_menu);
  const hasPages = Boolean(rows?.[0]?.has_pages);
  if (!hasMenu || !hasPages) {
    return;
  }

  await client.query(
    `INSERT INTO cms_pages (menu_item_id, title, summary, body, status, published_at)
		 SELECT id,
		        label,
		        CONCAT('Placeholder content for ', label),
		        CONCAT('## ', label, E'\n\nContent for this section will be managed through the SCPD CMS. Replace this text using the admin dashboard.'),
		        'published',
		        now()
		 FROM cms_menu_items
		 ON CONFLICT (menu_item_id) DO NOTHING`,
  );
}

export async function ensureCmsMediaCategoryConstraint() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.cms_media') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    const constraint = await client.query(
      `SELECT pg_get_constraintdef(c.oid) AS def
			 FROM pg_constraint c
			 JOIN pg_class t ON t.oid = c.conrelid
			 WHERE t.relname = 'cms_media'
			   AND c.conname = 'cms_media_category_check'
			 LIMIT 1`,
    );

    const def = constraint.rows?.[0]?.def;
    if (typeof def === "string" && def.includes("carousel")) {
      return;
    }

    await client.query("BEGIN");

    const legacyChecks = await client.query(
      `SELECT c.conname
			 FROM pg_constraint c
			 JOIN pg_class t ON t.oid = c.conrelid
			 WHERE t.relname = 'cms_media'
			   AND c.contype = 'c'
			   AND pg_get_constraintdef(c.oid) ILIKE '%category%'`,
    );

    for (const row of legacyChecks.rows) {
      if (!row?.conname) continue;
      await client.query(
        `ALTER TABLE cms_media DROP CONSTRAINT ${quoteIdent(row.conname)}`,
      );
    }

    await client.query(
      "ALTER TABLE cms_media ADD CONSTRAINT cms_media_category_check CHECK (category IN ('photo','video','newspaper','audio','carousel'))",
    );

    await client.query("COMMIT");
    console.log("Ensured cms_media_category_check allows 'carousel'.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.warn(
      "DB schema check: unable to ensure cms_media category constraint:",
      error,
    );
  } finally {
    client.release();
  }
}

export async function ensureBaseCmsSchema() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT
				to_regclass('public.cms_menu_items') IS NOT NULL AS has_menu,
				to_regclass('public.cms_media') IS NOT NULL AS has_media,
				to_regclass('public.news') IS NOT NULL AS has_news,
				to_regclass('public.cms_pages') IS NOT NULL AS has_pages`,
    );

    const hasMenu = Boolean(rows?.[0]?.has_menu);
    const hasMedia = Boolean(rows?.[0]?.has_media);
    const hasNews = Boolean(rows?.[0]?.has_news);
    const hasPages = Boolean(rows?.[0]?.has_pages);

    if (!(hasMenu && hasMedia && hasNews && hasPages)) {
      const initSqlPath = resolveInitSqlPath();
      if (!initSqlPath) {
        console.warn(
          "DB bootstrap file not found; skipping auto-schema bootstrap.",
        );
        return;
      }

      const initSql = fs.readFileSync(initSqlPath, "utf8");
      await client.query(initSql);
      console.log(`Ensured base CMS schema from ${initSqlPath}`);
    }

    await ensurePublishedCmsPages(client);
    await ensureAdminUserLockColumns();
    await ensureCmsPagesPluralColumns();
  } finally {
    client.release();
  }
}

export async function ensureAdminUserLockColumns() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.admin_users') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    await client.query(`
      ALTER TABLE admin_users
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
    `);
  } catch (error) {
    console.warn(
      "DB schema check: unable to ensure admin_users lock columns:",
      error,
    );
  } finally {
    client.release();
  }
}

export async function ensureCmsPagesPluralColumns() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.cms_pages') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    await client.query(`
      ALTER TABLE cms_pages 
      ADD COLUMN IF NOT EXISTS attachments_paths JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS attachments_captions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS common_attachments_caption TEXT,
      ADD COLUMN IF NOT EXISTS hero_image_paths JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS hero_image_captions JSONB DEFAULT '[]'::jsonb;
    `);

    const tableCheckVersions = await client.query(
      "SELECT to_regclass('public.cms_page_versions') IS NOT NULL AS exists",
    );
    if (!tableCheckVersions.rows?.[0]?.exists) {
      return;
    }

    await client.query(`
      ALTER TABLE cms_page_versions 
      ADD COLUMN IF NOT EXISTS attachments_paths JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS attachments_captions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS common_attachments_caption TEXT,
      ADD COLUMN IF NOT EXISTS hero_image_paths JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS hero_image_captions JSONB DEFAULT '[]'::jsonb;
    `);
  } catch (error) {
    console.warn(
      "DB schema check: unable to ensure cms_pages plural columns:",
      error,
    );
  } finally {
    client.release();
  }
}

export async function ensureCmsMediaFileBytesColumn() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.cms_media') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    await client.query(
      "ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS file_bytes BYTEA",
    );
  } catch (error) {
    console.warn(
      "DB schema check: unable to ensure cms_media.file_bytes column:",
      error,
    );
  } finally {
    client.release();
  }
}

export async function ensureCmsMediaCaptionTextColorColumn() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.cms_media') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    await client.query(
      "ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS caption_text_color TEXT",
    );
  } catch (error) {
    console.warn(
      "DB schema check: unable to ensure cms_media.caption_text_color column:",
      error,
    );
  } finally {
    client.release();
  }
}
