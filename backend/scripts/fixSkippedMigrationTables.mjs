#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

function cleanDbPass(v) {
  if (v == null) return v;
  return String(v).replace(/^"|"$/g, "");
}

function safeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

async function run() {
  const source = new Client({
    host: process.env.SRC_DB_HOST || "localhost",
    port: Number(process.env.SRC_DB_PORT || 55400),
    user: process.env.SRC_DB_USER || "postgres",
    password: process.env.SRC_DB_PASS || "postgres",
    database: process.env.SRC_DB_NAME || "scpd_cms",
  });

  const target = new Client({
    host: process.env.DB_HOST || process.env.PGHOST,
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    user: process.env.DB_USER || process.env.PGUSER,
    password: cleanDbPass(process.env.DB_PASS || process.env.PGPASSWORD),
    database: process.env.DB_NAME || process.env.PGDATABASE || "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await source.connect();
  await target.connect();

  try {
    await target.query("BEGIN");

    const menuRows = await target.query(`SELECT id FROM public.cms_menu_items`);
    const pageRows = await target.query(`SELECT id FROM public.cms_pages`);
    const validMenuIds = new Set(menuRows.rows.map((r) => Number(r.id)));
    const validPageIds = new Set(pageRows.rows.map((r) => Number(r.id)));

    const dynamicRows = await source.query(`SELECT * FROM public.cms_dynamic_tables`);
    let dynamicUpserted = 0;
    for (const row of dynamicRows.rows) {
      const columns = safeJson(row.columns, []);
      await target.query(
        `
          INSERT INTO public.cms_dynamic_tables
          (table_name, display_name, expose_frontend, header_bg_color, header_text_color, body_text_color, columns, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
          ON CONFLICT (table_name) DO UPDATE
          SET display_name = EXCLUDED.display_name,
              expose_frontend = EXCLUDED.expose_frontend,
              header_bg_color = EXCLUDED.header_bg_color,
              header_text_color = EXCLUDED.header_text_color,
              body_text_color = EXCLUDED.body_text_color,
              columns = EXCLUDED.columns,
              created_at = EXCLUDED.created_at;
        `,
        [
          row.table_name,
          row.display_name,
          row.expose_frontend,
          row.header_bg_color,
          row.header_text_color,
          row.body_text_color,
          JSON.stringify(columns),
          row.created_at,
        ]
      );
      dynamicUpserted += 1;
    }

    await target.query(`TRUNCATE TABLE public.cms_footer_links RESTART IDENTITY`);
    const footerRows = await source.query(`SELECT * FROM public.cms_footer_links ORDER BY sort_order, menu_item_id`);
    let footerInserted = 0;
    let footerSkipped = 0;
    for (const row of footerRows.rows) {
      if (!validMenuIds.has(Number(row.menu_item_id))) {
        footerSkipped += 1;
        continue;
      }
      await target.query(
        `
          INSERT INTO public.cms_footer_links
          (menu_item_id, section, link_label, sort_order, is_active, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7);
        `,
        [
          row.menu_item_id,
          row.section,
          row.link_label,
          row.sort_order,
          row.is_active,
          row.created_at,
          row.updated_at,
        ]
      );
      footerInserted += 1;
    }

    await target.query(`TRUNCATE TABLE public.cms_page_versions RESTART IDENTITY`);
    const versionRows = await source.query(`SELECT * FROM public.cms_page_versions ORDER BY id`);
    let versionsInserted = 0;
    let versionsSkipped = 0;
    for (const row of versionRows.rows) {
      if (!validPageIds.has(Number(row.page_id))) {
        versionsSkipped += 1;
        continue;
      }
      await target.query(
        `
          INSERT INTO public.cms_page_versions
          (id, page_id, title, summary, body, title_or, summary_or, body_or, status, created_at, created_by,
           attachments_paths, attachments_captions, common_attachments_caption, hero_image_paths, hero_image_captions)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb,$16::jsonb);
        `,
        [
          row.id,
          row.page_id,
          row.title,
          row.summary,
          row.body,
          row.title_or,
          row.summary_or,
          row.body_or,
          row.status,
          row.created_at,
          row.created_by,
          JSON.stringify(safeJson(row.attachments_paths, [])),
          JSON.stringify(safeJson(row.attachments_captions, [])),
          row.common_attachments_caption,
          JSON.stringify(safeJson(row.hero_image_paths, [])),
          JSON.stringify(safeJson(row.hero_image_captions, [])),
        ]
      );
      versionsInserted += 1;
    }
    await target.query(
      `SELECT setval('public.cms_page_versions_id_seq', COALESCE((SELECT MAX(id) FROM public.cms_page_versions),1), (SELECT MAX(id) IS NOT NULL FROM public.cms_page_versions))`
    );

    await target.query(`TRUNCATE TABLE public.cms_page_workflow_logs RESTART IDENTITY`);
    const workflowRows = await source.query(`SELECT * FROM public.cms_page_workflow_logs ORDER BY id`);
    let workflowInserted = 0;
    let workflowSkipped = 0;
    for (const row of workflowRows.rows) {
      if (!validPageIds.has(Number(row.page_id)) || !validMenuIds.has(Number(row.menu_item_id))) {
        workflowSkipped += 1;
        continue;
      }
      await target.query(
        `
          INSERT INTO public.cms_page_workflow_logs
          (id, page_id, menu_item_id, actor_id, action, from_status, to_status, comment, metadata, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10);
        `,
        [
          row.id,
          row.page_id,
          row.menu_item_id,
          row.actor_id,
          row.action,
          row.from_status,
          row.to_status,
          row.comment,
          JSON.stringify(safeJson(row.metadata, null)),
          row.created_at,
        ]
      );
      workflowInserted += 1;
    }
    await target.query(
      `SELECT setval('public.cms_page_workflow_logs_id_seq', COALESCE((SELECT MAX(id) FROM public.cms_page_workflow_logs),1), (SELECT MAX(id) IS NOT NULL FROM public.cms_page_workflow_logs))`
    );

    await target.query(`TRUNCATE TABLE public.documents, public.cases RESTART IDENTITY CASCADE`);
    const caseRows = await source.query(`SELECT * FROM public.cases ORDER BY created_at, id`);
    let casesInserted = 0;
    for (const row of caseRows.rows) {
      const publicId = row.registration_no || `LEGACY-${String(row.id).slice(0, 8)}`;
      const title = row.case_no || row.subject || publicId;
      const applicantName = row.complainant_name || "Unknown";
      await target.query(
        `
          INSERT INTO public.cases
          (id, public_id, title, applicant_name, applicant_address, description, category_id, district_id, status_id, department_id, officer_id, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13);
        `,
        [
          row.id,
          publicId,
          title,
          applicantName,
          null,
          row.subject,
          null,
          null,
          null,
          null,
          null,
          row.created_at,
          row.updated_at || row.created_at,
        ]
      );
      casesInserted += 1;
    }

    const docRows = await source.query(`SELECT * FROM public.documents ORDER BY created_at, id`);
    let docsInserted = 0;
    let docsSkipped = 0;
    for (const row of docRows.rows) {
      const exists = await target.query(`SELECT 1 FROM public.cases WHERE id=$1`, [row.case_id]);
      if (!exists.rowCount) {
        docsSkipped += 1;
        continue;
      }
      await target.query(
        `
          INSERT INTO public.documents
          (id, case_id, uploaded_by_user_id, uploaded_by_name, filename, storage_key, mime_type, size_bytes, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9);
        `,
        [
          row.id,
          row.case_id,
          row.uploaded_by_id,
          null,
          row.file_name,
          row.storage_key,
          row.mime_type,
          row.size_bytes,
          row.created_at,
        ]
      );
      docsInserted += 1;
    }

    await target.query("COMMIT");

    console.log("Second-pass migration completed.");
    console.log(`cms_dynamic_tables upserted: ${dynamicUpserted}`);
    console.log(`cms_footer_links inserted/skipped: ${footerInserted}/${footerSkipped}`);
    console.log(`cms_page_versions inserted/skipped: ${versionsInserted}/${versionsSkipped}`);
    console.log(`cms_page_workflow_logs inserted/skipped: ${workflowInserted}/${workflowSkipped}`);
    console.log(`cases inserted: ${casesInserted}`);
    console.log(`documents inserted/skipped: ${docsInserted}/${docsSkipped}`);
  } catch (error) {
    await target.query("ROLLBACK");
    console.error("Second-pass migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

run();
