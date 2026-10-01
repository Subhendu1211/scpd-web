import { validationResult } from "express-validator";
import {
  listOrgUnits,
  createOrgUnit,
  updateOrgUnit,
  reorderOrgUnit,
  deleteOrgUnit
} from "../services/adminOrgChartService.js";

export async function list(req, res, next) {
  try {
    const activeOnly = req.query.activeOnly === "true";
    const data = await listOrgUnits({ activeOnly });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const payload = {
      parentId: req.body.parentId ?? null,
      name: req.body.name,
      title: req.body.title ?? null,
      department: req.body.department ?? null,
      email: req.body.email ?? null,
      phone: req.body.phone ?? null,
      photoUrl: req.body.photoUrl ?? null,
      sortOrder: req.body.sortOrder ?? 0,
      isActive: req.body.isActive ?? true,
      metadata: req.body.metadata ?? null
    };
    const data = await createOrgUnit(payload);
    return res.status(201).json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to create org item" });
  }
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const payload = {
      parentId: req.body.parentId,
      name: req.body.name,
      title: req.body.title,
      department: req.body.department,
      email: req.body.email,
      phone: req.body.phone,
      photoUrl: req.body.photoUrl,
      sortOrder: req.body.sortOrder,
      isActive: req.body.isActive,
      metadata: req.body.metadata
    };
    const data = await updateOrgUnit(Number(id), payload);
    if (!data) {
      return res.status(404).json({ error: "Org item not found" });
    }
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update org item" });
  }
}

export async function reorder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const data = await reorderOrgUnit(Number(id), req.body.parentId ?? null, req.body.sortOrder ?? 0);
    if (!data) {
      return res.status(404).json({ error: "Org item not found" });
    }
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to reorder org item" });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    await deleteOrgUnit(Number(id));
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to delete org item" });
  }
}
