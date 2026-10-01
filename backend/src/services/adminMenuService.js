import { pool } from "../models/db.js";

async function ensureMenuImageColumn(client) {
  await client.query(`
    ALTER TABLE cms_menu_items
      ADD COLUMN IF NOT EXISTS image_path TEXT;
  `);
}

function mapMenuRows(rows) {
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
      isActive: row.is_active,
      parentId: row.parent_id,
      children: []
    });
  });

  const roots = [];
  rows.forEach((row) => {
    const node = nodes.get(row.id);
    if (!node) {
      return;
    }
    if (!row.parent_id) {
      roots.push(node);
    } else {
      const parent = nodes.get(row.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  const sortTree = (items) => {
    items.sort((a, b) => {
      if (a.sortOrder === b.sortOrder) {
        return a.label.localeCompare(b.label);
      }
      return a.sortOrder - b.sortOrder;
    });
    items.forEach((child) => sortTree(child.children));
  };

  sortTree(roots);
  return roots;
}

export async function listMenuItems() {
  const client = await pool.connect();
  try {
    await ensureMenuImageColumn(client);
    const { rows } = await client.query(
      `SELECT id, parent_id, label, slug, path, description, image_path, sort_order, is_active
       FROM cms_menu_items
       ORDER BY parent_id NULLS FIRST, sort_order, label`
    );
    return mapMenuRows(rows);
  } finally {
    client.release();
  }
}

export async function createMenuItem(payload) {
  const client = await pool.connect();
  try {
    await ensureMenuImageColumn(client);
    const { rows } = await client.query(
      `INSERT INTO cms_menu_items (parent_id, label, slug, path, description, image_path, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, parent_id, label, slug, path, description, image_path, sort_order, is_active`,
      [
        payload.parentId || null,
        payload.label,
        payload.slug,
        payload.path,
        payload.description || null,
        payload.imagePath || null,
        payload.sortOrder ?? 0,
        payload.isActive ?? true
      ]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

export async function updateMenuItem(id, updates) {
  const client = await pool.connect();
  try {
    await ensureMenuImageColumn(client);
    const fields = [];
    const values = [];

    Object.entries({
      parent_id: updates.parentId,
      label: updates.label,
      slug: updates.slug,
      path: updates.path,
      description: updates.description,
      image_path: updates.imagePath,
      sort_order: updates.sortOrder,
      is_active: updates.isActive
    })
      .filter(([, value]) => value !== undefined)
      .forEach(([column, value], index) => {
        fields.push(`${column} = $${index + 1}`);
        values.push(value === undefined ? null : value);
      });

    if (!fields.length) {
      return null;
    }

    values.push(id);
    const idPlaceholder = `$${fields.length + 1}`;
    const { rows } = await client.query(
      `UPDATE cms_menu_items SET ${fields.join(", ")}, updated_at = now() WHERE id = ${idPlaceholder}
       RETURNING id, parent_id, label, slug, path, description, image_path, sort_order, is_active`,
      values
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function updateMenuItemOrder(id, parentId, sortOrder) {
  const client = await pool.connect();
  try {
    await ensureMenuImageColumn(client);
    const { rows } = await client.query(
      `UPDATE cms_menu_items
         SET parent_id = $1,
             sort_order = $2,
             updated_at = now()
       WHERE id = $3
       RETURNING id, parent_id, label, slug, path, description, image_path, sort_order, is_active`,
      [parentId || null, sortOrder ?? 0, id]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function deleteMenuItem(id) {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM cms_menu_items WHERE id = $1`, [id]);
  } finally {
    client.release();
  }
}
