import { pool } from "../models/db.js";
import { recordPageWorkflowLog, recordUserLog } from "./auditService.js";

const WORKFLOW_STATUSES = new Set([
  "draft",
  "department_review",
  "editor_review",
  "publishing_review",
  "published",
]);

const FOOTER_SECTIONS = new Set(["contact", "policies", "governance"]);

const ROLE_ALIASES = new Map([["admin", "superadmin"]]);

// Workflow permissions per role. Authors are forced to draft even when editing other statuses.
const ROLE_TRANSITIONS = {
  author: {
    draft: ["draft"],
    department_review: ["draft"],
    editor_review: ["draft"],
    publishing_review: ["draft"],
    published: ["draft"],
  },
  department_reviewer: {
    department_review: ["department_review", "editor_review"],
  },
  editor: {
    draft: ["draft", "editor_review", "publishing_review", "published"],
    department_review: [
      "draft",
      "editor_review",
      "publishing_review",
      "published",
    ],
    editor_review: ["draft", "editor_review", "publishing_review", "published"],
    publishing_review: ["draft", "publishing_review", "published"],
    published: ["draft", "published"],
  },
  publishing_officer: {
    draft: ["draft", "publishing_review", "published"],
    department_review: ["draft", "publishing_review", "published"],
    editor_review: ["draft", "publishing_review", "published"],
    publishing_review: ["draft", "publishing_review", "published"],
    published: ["draft", "published"],
  },
  superadmin: "*",
};

function canCreateStatus(role, toStatus) {
  if (role === "superadmin") return true;
  if (role === "author") return toStatus === "draft";
  if (role === "editor")
    return [
      "draft",
      "editor_review",
      "publishing_review",
      "published",
    ].includes(toStatus);
  if (role === "publishing_officer")
    return ["draft", "publishing_review", "published"].includes(toStatus);
  if (role === "department_reviewer") return toStatus === "department_review";
  return false;
}

async function ensurePageTableMapping(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_page_tables (
      menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
      table_name TEXT NOT NULL
    );
  `);
}

async function ensurePageStyleTable(client) {
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

  await client.query(`
    ALTER TABLE cms_page_styles
      ADD COLUMN IF NOT EXISTS show_publish_date BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

function normalizeRole(role) {
  if (!role) {
    return "author";
  }
  const lower = role.toLowerCase();
  return ROLE_ALIASES.get(lower) || lower;
}

function ensureValidStatus(status) {
  if (!WORKFLOW_STATUSES.has(status)) {
    throw new Error("Invalid workflow status");
  }
}

function coerceStatusForRole(role, requestedStatus) {
  if (role === "author") {
    return "draft";
  }
  return requestedStatus;
}

function isTransitionAllowed(role, fromStatus, toStatus) {
  if (fromStatus === toStatus) {
    return true;
  }

  if (role === "superadmin") {
    return true;
  }

  if (!fromStatus) {
    return canCreateStatus(role, toStatus);
  }

  const transitions = ROLE_TRANSITIONS[role];
  if (!transitions) {
    return false;
  }

  const allowedTargets = transitions[fromStatus] || [];
  return allowedTargets.includes(toStatus);
}

function resolvePublishedAt(newStatus, proposed, existingRow) {
  if (newStatus === "published") {
    if (proposed instanceof Date && !Number.isNaN(proposed.getTime())) {
      return proposed;
    }
    if (existingRow?.published_at) {
      return existingRow.published_at;
    }
    return new Date();
  }

  if (proposed instanceof Date && !Number.isNaN(proposed.getTime())) {
    return proposed;
  }

  return null;
}

function normalizeCmsPath(path) {
  if (typeof path !== "string") {
    return "";
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeadingSlash.replace(/\/+$/, "");
  return (withoutTrailing || "/").toLowerCase();
}

function slugifyPath(path) {
  const base = String(path || "")
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "footer-page";
}

async function ensureUniqueSlug(client, preferredSlug) {
  const root = slugifyPath(preferredSlug);
  let candidate = root;
  let suffix = 1;

  while (true) {
    const existing = await client.query(
      `SELECT 1 FROM cms_menu_items WHERE slug = $1 LIMIT 1`,
      [candidate],
    );
    if (!existing.rows.length) {
      return candidate;
    }
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

async function resolveMenuItemIdForPage(client, { menuItemId, customPath, customLabel, title }) {
  if (Number.isInteger(menuItemId) && menuItemId > 0) {
    const existingById = await client.query(
      `SELECT id FROM cms_menu_items WHERE id = $1 LIMIT 1`,
      [menuItemId],
    );
    if (!existingById.rows.length) {
      throw new Error("Selected menu item does not exist");
    }
    return { menuItemId, customPath: null };
  }

  const normalizedPath = normalizeCmsPath(customPath);
  if (!normalizedPath || normalizedPath === "/") {
    throw new Error("Custom path is required when menu item is not selected");
  }

  const byPath = await client.query(
    `SELECT id FROM cms_menu_items WHERE path = $1 LIMIT 1`,
    [normalizedPath],
  );
  if (byPath.rows.length) {
    return { menuItemId: byPath.rows[0].id, customPath: normalizedPath };
  }

  const preferredSlug = slugifyPath(normalizedPath);
  const slug = await ensureUniqueSlug(client, preferredSlug);
  const label =
    (typeof customLabel === "string" && customLabel.trim()) ||
    (typeof title === "string" && title.trim()) ||
    slug
      .split("-")
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(" ");

  const inserted = await client.query(
    `INSERT INTO cms_menu_items (parent_id, label, slug, path, description, sort_order, is_active)
     VALUES (NULL, $1, $2, $3, $4, 9999, FALSE)
     RETURNING id`,
    [label, slug, normalizedPath, "Auto-created for standalone/footer CMS page"],
  );

  return {
    menuItemId: inserted.rows[0].id,
    customPath: normalizedPath,
  };
}

async function upsertPageTableMapping(client, menuItemId, dynamicTableName) {
  await ensurePageTableMapping(client);
  if (!dynamicTableName) {
    await client.query(`DELETE FROM cms_page_tables WHERE menu_item_id = $1`, [
      menuItemId,
    ]);
    return;
  }
  await client.query(
    `INSERT INTO cms_page_tables (menu_item_id, table_name)
     VALUES ($1, $2)
     ON CONFLICT (menu_item_id)
     DO UPDATE SET table_name = EXCLUDED.table_name`,
    [menuItemId, dynamicTableName],
  );
}

async function upsertPageStyle(client, menuItemId, style = {}) {
  await ensurePageStyleTable(client);
  const {
    fontFamily = null,
    fontColor = null,
    backgroundColor = null,
    pageLayout = null,
    showPublishDate = false,
  } = style;
  if (!fontFamily && !fontColor && !backgroundColor && !pageLayout && !showPublishDate) {
    await client.query(`DELETE FROM cms_page_styles WHERE menu_item_id = $1`, [
      menuItemId,
    ]);
    return;
  }
  await client.query(
    `INSERT INTO cms_page_styles (menu_item_id, font_family, font_color, background_color, page_layout, show_publish_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (menu_item_id)
       DO UPDATE SET font_family = EXCLUDED.font_family,
                     font_color = EXCLUDED.font_color,
                     background_color = EXCLUDED.background_color,
                     page_layout = EXCLUDED.page_layout,
                     show_publish_date = EXCLUDED.show_publish_date`,
    [
      menuItemId,
      fontFamily || null,
      fontColor || null,
      backgroundColor || null,
      pageLayout || null,
      Boolean(showPublishDate),
    ],
  );
}

async function upsertFooterAssignment(
  client,
  menuItemId,
  footer = {},
) {
  await ensureFooterLinksTable(client);
  const {
    showInFooter = false,
    footerSection = null,
    footerLabel = null,
    footerOrder = 0,
  } = footer;

  if (!showInFooter) {
    await client.query(`DELETE FROM cms_footer_links WHERE menu_item_id = $1`, [
      menuItemId,
    ]);
    return;
  }

  if (!footerSection || !FOOTER_SECTIONS.has(footerSection)) {
    throw new Error("Invalid footer section");
  }

  await client.query(
    `INSERT INTO cms_footer_links (menu_item_id, section, link_label, sort_order, is_active, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, now())
     ON CONFLICT (menu_item_id)
     DO UPDATE SET section = EXCLUDED.section,
                   link_label = EXCLUDED.link_label,
                   sort_order = EXCLUDED.sort_order,
                   is_active = TRUE,
                   updated_at = now()`,
    [
      menuItemId,
      footerSection,
      footerLabel || null,
      Number.isFinite(Number(footerOrder)) ? Number(footerOrder) : 0,
    ],
  );
}

export async function listPages({ status } = {}) {
  const client = await pool.connect();
  try {
    await ensurePageTableMapping(client);
    await ensurePageStyleTable(client);
    await ensureFooterLinksTable(client);
    const params = [];
    const where = [];
    if (status) {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }

    const { rows } = await client.query(
      `SELECT
         p.id,
         p.menu_item_id AS "menuItemId",
         m.label AS "menuLabel",
         m.slug AS "menuSlug",
         m.path AS "menuPath",
         p.title AS "title",
         p.summary AS "summary",
         p.body AS "body",
         p.title_or AS "titleOr",
         p.summary_or AS "summaryOr",
         p.body_or AS "bodyOr",
         p.hero_image_path AS "heroImagePath",
         p.hero_image_paths AS "heroImagePaths",
         p.hero_image_captions AS "heroImageCaptions",
         p.attachments_paths AS "attachmentsPaths",
         p.attachments_captions AS "attachmentsCaptions",
         p.status AS "status",
         p.published_at AS "publishedAt",
         p.updated_at AS "updatedAt",
         t.table_name AS "dynamicTableName",
         s.font_family AS "fontFamily",
         s.font_color AS "fontColor",
         s.background_color AS "backgroundColor",
         s.page_layout AS "pageLayout",
         COALESCE(s.show_publish_date, FALSE) AS "showPublishDate",
         COALESCE(fl.is_active, FALSE) AS "showInFooter",
         fl.section AS "footerSection",
         fl.link_label AS "footerLabel",
         fl.sort_order AS "footerOrder"
       FROM cms_pages p
       JOIN cms_menu_items m ON m.id = p.menu_item_id
       LEFT JOIN cms_page_tables t ON t.menu_item_id = p.menu_item_id
       LEFT JOIN cms_page_styles s ON s.menu_item_id = p.menu_item_id
       LEFT JOIN cms_footer_links fl ON fl.menu_item_id = p.menu_item_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY m.path`,
      params,
    );
    return rows;
  } finally {
    client.release();
  }
}

export async function getPageByMenuItem(menuItemId) {
  const client = await pool.connect();
  try {
    await ensurePageTableMapping(client);
    await ensurePageStyleTable(client);
    await ensureFooterLinksTable(client);
    const { rows } = await client.query(
      `SELECT
         p.id,
         p.menu_item_id AS "menuItemId",
         m.label AS "menuLabel",
         m.slug AS "menuSlug",
         m.path AS "menuPath",
         p.title AS "title",
         p.summary AS "summary",
         p.body AS "body",
         p.title_or AS "titleOr",
         p.summary_or AS "summaryOr",
         p.body_or AS "bodyOr",
         p.hero_image_path AS "heroImagePath",
         p.hero_image_paths AS "heroImagePaths",
         p.hero_image_captions AS "heroImageCaptions",
         p.attachments_paths AS "attachmentsPaths",
         p.attachments_captions AS "attachmentsCaptions",
         p.status AS "status",
         p.published_at AS "publishedAt",
         p.created_at AS "createdAt",
         p.updated_at AS "updatedAt",
         t.table_name AS "dynamicTableName",
         s.font_family AS "fontFamily",
         s.font_color AS "fontColor",
         s.background_color AS "backgroundColor",
         s.page_layout AS "pageLayout",
         COALESCE(s.show_publish_date, FALSE) AS "showPublishDate",
         COALESCE(fl.is_active, FALSE) AS "showInFooter",
         fl.section AS "footerSection",
         fl.link_label AS "footerLabel",
         fl.sort_order AS "footerOrder"
       FROM cms_pages p
       JOIN cms_menu_items m ON m.id = p.menu_item_id
       LEFT JOIN cms_page_tables t ON t.menu_item_id = p.menu_item_id
       LEFT JOIN cms_page_styles s ON s.menu_item_id = p.menu_item_id
       LEFT JOIN cms_footer_links fl ON fl.menu_item_id = p.menu_item_id
       WHERE p.menu_item_id = $1`,
      [menuItemId],
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function upsertPage({
  menuItemId,
  customPath,
  customLabel,
  title,
  summary,
  body,
  titleOr,
  summaryOr,
  bodyOr,
  heroImagePath,
  heroImagePaths,
  heroImageCaptions,
  attachmentsPaths,
  attachmentsCaptions,
  commonAttachmentsCaption,
  status: requestedStatus,
  publishedAt,
  adminUserId,
  actorRole,
  ipAddress,
  dynamicTableName,
  fontFamily,
  fontColor,
  backgroundColor,
  pageLayout,
  showPublishDate,
  showInFooter,
  footerSection,
  footerLabel,
  footerOrder,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await ensurePageTableMapping(client);
    await ensurePageStyleTable(client);
    await ensureFooterLinksTable(client);

    const normalizedRole = normalizeRole(actorRole);
    const status = coerceStatusForRole(normalizedRole, requestedStatus);
    ensureValidStatus(status);

    const resolved = await resolveMenuItemIdForPage(client, {
      menuItemId,
      customPath,
      customLabel,
      title,
    });
    const resolvedMenuItemId = resolved.menuItemId;

    const existing = await client.query(
      `SELECT id, status, published_at FROM cms_pages WHERE menu_item_id = $1 FOR UPDATE`,
      [resolvedMenuItemId],
    );

    let pageRow;
    let previousStatus = null;
    let statusChanged = false;

    if (existing.rows.length) {
      const pageId = existing.rows[0].id;
      previousStatus = existing.rows[0].status;

      if (!isTransitionAllowed(normalizedRole, previousStatus, status)) {
        throw new Error("You do not have permission to set this status");
      }

      const nextPublishedAt = resolvePublishedAt(
        status,
        publishedAt,
        existing.rows[0],
      );
      statusChanged = previousStatus !== status;

      const attachmentsPathsJson = Array.isArray(attachmentsPaths)
        ? JSON.stringify(attachmentsPaths)
        : "[]";
      const attachmentsCaptionsJson = Array.isArray(attachmentsCaptions)
        ? JSON.stringify(attachmentsCaptions)
        : "[]";

      const heroImagePathsJson = Array.isArray(heroImagePaths)
        ? JSON.stringify(heroImagePaths)
        : "[]";
      const heroImageCaptionsJson = Array.isArray(heroImageCaptions)
        ? JSON.stringify(heroImageCaptions)
        : "[]";

      // Populate legacy hero_image_path with first image if not explicitly provided
      const resolvedHeroImagePath =
        heroImagePath ||
        (Array.isArray(heroImagePaths) && heroImagePaths.length > 0
          ? heroImagePaths[0]
          : null);

      const { rows } = await client.query(
        `UPDATE cms_pages
           SET title = $1,
               summary = $2,
               body = $3,
               title_or = $4,
               summary_or = $5,
               body_or = $6,
               hero_image_path = $7,
               attachments_paths = $8,
               attachments_captions = $14,
               common_attachments_caption = $15,
               status = $9,
               published_at = $10,
               updated_at = now(),
               hero_image_paths = $11,
               hero_image_captions = $13
         WHERE id = $12
         RETURNING
           id,
           menu_item_id AS "menuItemId",
           title AS "title",
           summary AS "summary",
           body AS "body",
           title_or AS "titleOr",
           summary_or AS "summaryOr",
           body_or AS "bodyOr",
           hero_image_path AS "heroImagePath",
           hero_image_paths AS "heroImagePaths",
           hero_image_captions AS "heroImageCaptions",
           attachments_paths AS "attachmentsPaths",
           attachments_captions AS "attachmentsCaptions",
           common_attachments_caption AS "commonAttachmentsCaption",
           status AS "status",
           published_at AS "publishedAt",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [
          title,
          summary,
          body,
          titleOr,
          summaryOr,
          bodyOr,
          resolvedHeroImagePath,
          attachmentsPathsJson,
          status,
          nextPublishedAt,
          heroImagePathsJson,
          pageId,
          heroImageCaptionsJson,
          attachmentsCaptionsJson,
          commonAttachmentsCaption || null,
        ],
      );
      pageRow = rows[0];
      await upsertPageTableMapping(client, resolvedMenuItemId, dynamicTableName);
      await upsertPageStyle(client, resolvedMenuItemId, {
        fontFamily,
        fontColor,
        backgroundColor,
        pageLayout,
        showPublishDate,
      });
      await upsertFooterAssignment(client, resolvedMenuItemId, {
        showInFooter,
        footerSection,
        footerLabel,
        footerOrder,
      });
      await client.query(
        `INSERT INTO cms_page_versions (page_id, title, summary, body, title_or, summary_or, body_or, attachments_paths, attachments_captions, common_attachments_caption, hero_image_paths, hero_image_captions, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $14, $10, $11, $12, $13)`,
        [
          pageId,
          title,
          summary,
          body,
          titleOr,
          summaryOr,
          bodyOr,
          attachmentsPathsJson,
          attachmentsCaptionsJson,
          heroImagePathsJson,
          heroImageCaptionsJson,
          status,
          adminUserId || null,
          commonAttachmentsCaption || null,
        ],
      );
    } else {
      if (!isTransitionAllowed(normalizedRole, null, status)) {
        throw new Error(
          "You do not have permission to create a page in this status",
        );
      }

      const nextPublishedAt = resolvePublishedAt(status, publishedAt, null);
      statusChanged = true;

      const attachmentsPathsJson = Array.isArray(attachmentsPaths)
        ? JSON.stringify(attachmentsPaths)
        : "[]";
      const attachmentsCaptionsJson = Array.isArray(attachmentsCaptions)
        ? JSON.stringify(attachmentsCaptions)
        : "[]";

      const heroImagePathsJson = Array.isArray(heroImagePaths)
        ? JSON.stringify(heroImagePaths)
        : "[]";

      const heroImageCaptionsJson = Array.isArray(heroImageCaptions)
        ? JSON.stringify(heroImageCaptions)
        : "[]";

      // Populate legacy hero_image_path with first image if not explicitly provided
      const resolvedHeroImagePath =
        heroImagePath ||
        (Array.isArray(heroImagePaths) && heroImagePaths.length > 0
          ? heroImagePaths[0]
          : null);

      const { rows } = await client.query(
        `INSERT INTO cms_pages
           (menu_item_id, title, summary, body, title_or, summary_or, body_or, hero_image_path, hero_image_paths, hero_image_captions, attachments_paths, attachments_captions, common_attachments_caption, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $15, $13, $14)
         RETURNING
           id,
           menu_item_id AS "menuItemId",
           title AS "title",
           summary AS "summary",
           body AS "body",
           title_or AS "titleOr",
           summary_or AS "summaryOr",
           body_or AS "bodyOr",
           hero_image_path AS "heroImagePath",
           hero_image_paths AS "heroImagePaths",
           hero_image_captions AS "heroImageCaptions",
           attachments_paths AS "attachmentsPaths",
           attachments_captions AS "attachmentsCaptions",
           common_attachments_caption AS "commonAttachmentsCaption",
           status AS "status",
           published_at AS "publishedAt",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [
          resolvedMenuItemId,
          title,
          summary,
          body,
          titleOr,
          summaryOr,
          bodyOr,
          resolvedHeroImagePath,
          heroImagePathsJson,
          heroImageCaptionsJson,
          attachmentsPathsJson,
          attachmentsCaptionsJson,
          status,
          nextPublishedAt,
          commonAttachmentsCaption || null,
        ],
      );
      pageRow = rows[0];
      await upsertPageTableMapping(client, resolvedMenuItemId, dynamicTableName);
      await upsertPageStyle(client, resolvedMenuItemId, {
        fontFamily,
        fontColor,
        backgroundColor,
        pageLayout,
        showPublishDate,
      });
      await upsertFooterAssignment(client, resolvedMenuItemId, {
        showInFooter,
        footerSection,
        footerLabel,
        footerOrder,
      });
      await client.query(
        `INSERT INTO cms_page_versions (page_id, title, summary, body, title_or, summary_or, body_or, attachments_paths, attachments_captions, common_attachments_caption, hero_image_paths, hero_image_captions, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $14, $10, $11, $12, $13)`,
        [
          pageRow.id,
          title,
          summary,
          body,
          titleOr,
          summaryOr,
          bodyOr,
          attachmentsPathsJson,
          attachmentsCaptionsJson,
          heroImagePathsJson,
          heroImageCaptionsJson,
          status,
          adminUserId || null,
          commonAttachmentsCaption || null,
        ],
      );
    }

    await recordUserLog({
      client,
      userId: adminUserId || null,
      action: statusChanged ? "cms_page.status_change" : "cms_page.save",
      targetType: "cms_page",
      targetId: pageRow.id,
      details: {
        menuItemId: resolvedMenuItemId,
        requestedMenuItemId: menuItemId ?? null,
        customPath: resolved.customPath,
        status,
        previousStatus,
        statusChanged,
        showInFooter: Boolean(showInFooter),
        footerSection: footerSection || null,
      },
      ipAddress: ipAddress || null,
    });

    if (statusChanged) {
      await recordPageWorkflowLog({
        client,
        pageId: pageRow.id,
        menuItemId: resolvedMenuItemId,
        actorId: adminUserId || null,
        action: existing.rows.length
          ? "workflow.transition"
          : "workflow.create",
        fromStatus: previousStatus,
        toStatus: status,
        metadata: {
          title,
          actorRole: normalizedRole,
        },
      });
    }

    await client.query("COMMIT");
    return pageRow;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
