import { pool } from "../models/db.js";

function parsePagination({ page = 1, pageSize = 25 }) {
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safePageSize;
  return { page: safePage, pageSize: safePageSize, offset };
}

export async function listUserLogs({ page = 1, pageSize = 25 } = {}) {
  const { page: safePage, pageSize: safePageSize, offset } = parsePagination({ page, pageSize });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT
         l.id,
         l.user_id,
         u.email AS user_email,
         u.full_name AS user_name,
         l.action,
         l.target_type,
         l.target_id,
         l.details,
         l.ip_address,
         l.created_at,
         COUNT(*) OVER() AS total_count
       FROM admin_user_logs AS l
       LEFT JOIN admin_users AS u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [safePageSize, offset]
    );

    const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0;

    return {
      data: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        details: row.details,
        ipAddress: row.ip_address,
        createdAt: row.created_at
      })),
      pagination: {
        total,
        page: safePage,
        pageSize: safePageSize
      }
    };
  } finally {
    client.release();
  }
}

export async function listWorkflowLogs({ page = 1, pageSize = 25 } = {}) {
  const { page: safePage, pageSize: safePageSize, offset } = parsePagination({ page, pageSize });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT
         l.id,
         l.page_id,
         l.menu_item_id,
         menu.label AS menu_label,
         menu.path AS menu_path,
         l.actor_id,
         actor.email AS actor_email,
         actor.full_name AS actor_name,
         l.action,
         l.from_status,
         l.to_status,
         l.comment,
         l.metadata,
         l.created_at,
         COUNT(*) OVER() AS total_count
       FROM cms_page_workflow_logs AS l
       LEFT JOIN cms_menu_items AS menu ON menu.id = l.menu_item_id
       LEFT JOIN admin_users AS actor ON actor.id = l.actor_id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [safePageSize, offset]
    );

    const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0;

    return {
      data: rows.map((row) => ({
        id: row.id,
        pageId: row.page_id,
        menuItemId: row.menu_item_id,
        menuLabel: row.menu_label,
        menuPath: row.menu_path,
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        actorName: row.actor_name,
        action: row.action,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        comment: row.comment,
        metadata: row.metadata,
        createdAt: row.created_at
      })),
      pagination: {
        total,
        page: safePage,
        pageSize: safePageSize
      }
    };
  } finally {
    client.release();
  }
}
