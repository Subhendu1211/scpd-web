import { pool } from "../models/db.js";

async function withClient(client, callback) {
  if (client) {
    return callback(client);
  }
  const connection = await pool.connect();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

export async function recordUserLog({
  client = null,
  userId = null,
  action,
  targetType = null,
  targetId = null,
  details = null,
  ipAddress = null
}) {
  if (!action) {
    throw new Error("User log action is required");
  }

  await withClient(client, async (db) => {
    await db.query(
      `INSERT INTO admin_user_logs (user_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, targetType, targetId, details, ipAddress]
    );
  });
}

export async function recordPageWorkflowLog({
  client = null,
  pageId,
  menuItemId,
  actorId = null,
  action,
  fromStatus = null,
  toStatus = null,
  comment = null,
  metadata = null
}) {
  if (!pageId || !menuItemId) {
    throw new Error("Workflow log requires pageId and menuItemId");
  }
  if (!action) {
    throw new Error("Workflow log action is required");
  }

  await withClient(client, async (db) => {
    await db.query(
      `INSERT INTO cms_page_workflow_logs
         (page_id, menu_item_id, actor_id, action, from_status, to_status, comment, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [pageId, menuItemId, actorId, action, fromStatus, toStatus, comment, metadata]
    );
  });
}
