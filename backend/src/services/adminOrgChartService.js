import { pool } from "../models/db.js";

function mapRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    title: row.title,
    department: row.department,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photo_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    metadata: row.metadata || {},
    children: []
  };
}

function buildTree(rows) {
  const nodes = new Map();
  rows.forEach((row) => {
    nodes.set(row.id, mapRow(row));
  });

  const roots = [];
  rows.forEach((row) => {
    const node = nodes.get(row.id);
    if (!node) return;
    if (row.parent_id === null || row.parent_id === undefined) {
      roots.push(node);
      return;
    }
    const parent = nodes.get(row.parent_id);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (items) => {
    items.sort((a, b) => {
      if (a.sortOrder === b.sortOrder) {
        return a.name.localeCompare(b.name);
      }
      return a.sortOrder - b.sortOrder;
    });
    items.forEach((child) => sortTree(child.children));
  };

  sortTree(roots);
  return roots;
}

export async function listOrgUnits({ activeOnly = false } = {}) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, parent_id, name, title, department, email, phone, photo_url, sort_order, is_active, metadata
         FROM cms_org_units
        ${activeOnly ? "WHERE is_active = TRUE" : ""}
        ORDER BY parent_id NULLS FIRST, sort_order, name`
    );
    return buildTree(rows);
  } finally {
    client.release();
  }
}

export async function createOrgUnit(payload) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO cms_org_units (parent_id, name, title, department, email, phone, photo_url, sort_order, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 0), COALESCE($9, TRUE), COALESCE($10, '{}'::jsonb))
       RETURNING id, parent_id, name, title, department, email, phone, photo_url, sort_order, is_active, metadata`,
      [
        payload.parentId ?? null,
        payload.name,
        payload.title ?? null,
        payload.department ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.photoUrl ?? null,
        payload.sortOrder ?? 0,
        payload.isActive ?? true,
        payload.metadata ?? null
      ]
    );
    return mapRow(rows[0]);
  } finally {
    client.release();
  }
}

export async function updateOrgUnit(id, updates) {
  if (updates.parentId !== undefined && updates.parentId === id) {
    throw new Error("An item cannot be its own parent");
  }

  const fields = [];
  const values = [];

  const setField = (column, value) => {
    fields.push(`${column} = $${fields.length + 1}`);
    values.push(value);
  };

  if (updates.parentId !== undefined) setField("parent_id", updates.parentId ?? null);
  if (updates.name !== undefined) setField("name", updates.name);
  if (updates.title !== undefined) setField("title", updates.title ?? null);
  if (updates.department !== undefined) setField("department", updates.department ?? null);
  if (updates.email !== undefined) setField("email", updates.email ?? null);
  if (updates.phone !== undefined) setField("phone", updates.phone ?? null);
  if (updates.photoUrl !== undefined) setField("photo_url", updates.photoUrl ?? null);
  if (updates.sortOrder !== undefined) setField("sort_order", updates.sortOrder ?? 0);
  if (updates.isActive !== undefined) setField("is_active", updates.isActive ?? false);
  if (updates.metadata !== undefined) setField("metadata", updates.metadata ?? {});

  if (!fields.length) {
    return null;
  }

  values.push(id);
  const idParam = `$${fields.length + 1}`;

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE cms_org_units
          SET ${fields.join(", ")},
              updated_at = now()
        WHERE id = ${idParam}
        RETURNING id, parent_id, name, title, department, email, phone, photo_url, sort_order, is_active, metadata`,
      values
    );
    return rows[0] ? mapRow(rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function reorderOrgUnit(id, parentId, sortOrder) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE cms_org_units
          SET parent_id = $1,
              sort_order = COALESCE($2, 0),
              updated_at = now()
        WHERE id = $3
        RETURNING id, parent_id, name, title, department, email, phone, photo_url, sort_order, is_active, metadata`,
      [parentId ?? null, sortOrder ?? 0, id]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function deleteOrgUnit(id) {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM cms_org_units WHERE id = $1", [id]);
  } finally {
    client.release();
  }
}
