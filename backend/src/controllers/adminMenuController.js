import { validationResult } from "express-validator";
import {
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemOrder,
  deleteMenuItem
} from "../services/adminMenuService.js";

export async function list(req, res) {
  const tree = await listMenuItems();
  return res.json({ data: tree });
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const payload = { ...req.body };
    if (payload.parentId !== undefined && payload.parentId !== null) {
      payload.parentId = Number(payload.parentId);
    } else {
      payload.parentId = null;
    }
    if (payload.sortOrder !== undefined) {
      payload.sortOrder = Number(payload.sortOrder);
    }
    const item = await createMenuItem(payload);
    return res.status(201).json({ data: item });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to create menu item" });
  }
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  try {
    const payload = { ...req.body };
    if (payload.parentId !== undefined) {
      payload.parentId = payload.parentId === null || payload.parentId === "" ? null : Number(payload.parentId);
    }
    if (payload.sortOrder !== undefined) {
      payload.sortOrder = Number(payload.sortOrder);
    }
    const item = await updateMenuItem(Number(id), payload);
    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    return res.json({ data: item });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update menu item" });
  }
}

export async function reorder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { parentId, sortOrder } = req.body;
  try {
    const parsedParent = parentId === undefined || parentId === null || parentId === ""
      ? null
      : Number(parentId);
    const parsedSort = sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? 0
      : Number(sortOrder);
    const item = await updateMenuItemOrder(Number(id), parsedParent, parsedSort);
    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    return res.json({ data: item });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to reorder menu item" });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    await deleteMenuItem(Number(id));
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to delete menu item" });
  }
}
