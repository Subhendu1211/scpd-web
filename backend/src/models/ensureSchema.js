import { pool } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { validatePasswordPolicy } from "../utils/passwordPolicy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_ROLES = new Set([
  "author",
  "department_reviewer",
  "editor",
  "publishing_officer",
  "superadmin",
  "admin",
]);

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

function resolveDefaultAdminSeedConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const explicitEmail = String(process.env.DEFAULT_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const explicitPassword = String(process.env.DEFAULT_ADMIN_PASSWORD || "").trim();
  const explicitRoleRaw = String(process.env.DEFAULT_ADMIN_ROLE || "superadmin")
    .trim()
    .toLowerCase();
  const explicitRole = ADMIN_ROLES.has(explicitRoleRaw)
    ? explicitRoleRaw
    : "superadmin";

  if (explicitEmail && explicitPassword) {
    return {
      email: explicitEmail,
      password: explicitPassword,
      role: explicitRole,
      fullName: process.env.DEFAULT_ADMIN_FULL_NAME || "System Admin",
    };
  }

  if (isProduction) {
    return null;
  }

  return {
    email: "admin@example.com",
    password: "Admin@123456",
    role: "superadmin",
    fullName: "Local Dev Admin",
  };
}

export async function ensureDefaultAdminUser() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.admin_users') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    const countResult = await client.query(
      "SELECT count(*)::int AS cnt FROM admin_users",
    );
    const totalUsers = Number(countResult.rows?.[0]?.cnt || 0);
    if (totalUsers > 0) {
      return;
    }

    const seedConfig = resolveDefaultAdminSeedConfig();
    if (!seedConfig) {
      console.warn(
        "No admin users found. Set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD to bootstrap an admin account.",
      );
      return;
    }

    const passwordPolicyError = validatePasswordPolicy(seedConfig.password);
    if (passwordPolicyError) {
      console.warn(
        `Default admin password is not strong enough: ${passwordPolicyError}`,
      );
      return;
    }

    const hash = await bcrypt.hash(seedConfig.password, 10);
    const insert = await client.query(
      `INSERT INTO admin_users (email, password_hash, role, full_name, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [seedConfig.email, hash, seedConfig.role, seedConfig.fullName || null],
    );

    if (insert.rows.length) {
      console.info(`Bootstrapped default admin user: ${insert.rows[0].email}`);
    }
  } catch (error) {
    console.warn("DB schema check: unable to ensure default admin user:", error);
  } finally {
    client.release();
  }
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
    await ensureAdminLoginOtpTable();
    await ensureDefaultAdminUser();
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

export async function ensureAdminLoginOtpTable() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.admin_users') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_login_otps (
        id SERIAL PRIMARY KEY,
        admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        otp_hash TEXT NOT NULL,
        delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('email', 'sms')),
        destination TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_login_otps_user
        ON admin_login_otps(admin_user_id, created_at DESC);
    `);
  } catch (error) {
    console.warn(
      "DB schema check: unable to ensure admin_login_otps table:",
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

export async function ensureCmsMediaFileChunksTable() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.cms_media') IS NOT NULL AS exists",
    );
    if (!tableCheck.rows?.[0]?.exists) {
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_media_file_chunks (
        media_id INTEGER NOT NULL REFERENCES cms_media(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        chunk_bytes BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (media_id, chunk_index)
      )
    `);
  } catch (error) {
    console.warn(
      "DB schema check: unable to ensure cms_media_file_chunks table:",
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
