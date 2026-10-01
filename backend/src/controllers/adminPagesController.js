import { validationResult } from "express-validator";
import {
  listPages,
  getPageByMenuItem,
  upsertPage,
} from "../services/adminPagesService.js";

export async function list(req, res) {
  const { status } = req.query;
  const pages = await listPages({ status });
  return res.json({ data: pages });
}

export async function get(req, res) {
  const { menuItemId } = req.params;
  const page = await getPageByMenuItem(Number(menuItemId));
  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }
  return res.json({ data: page });
}

export async function upsert(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const adminUserId = req.user?.id;
  try {
    const payload = { ...req.body };
    if (
      payload.menuItemId === undefined ||
      payload.menuItemId === null ||
      payload.menuItemId === ""
    ) {
      payload.menuItemId = null;
    } else {
      payload.menuItemId = Number(payload.menuItemId);
      if (!Number.isInteger(payload.menuItemId) || payload.menuItemId <= 0) {
        return res.status(400).json({ error: "menuItemId must be a positive integer" });
      }
    }

    if (typeof payload.customPath === "string") {
      payload.customPath = payload.customPath.trim() || null;
    }

    if (typeof payload.customLabel === "string") {
      payload.customLabel = payload.customLabel.trim() || null;
    }

    payload.showInFooter = Boolean(payload.showInFooter);
    if (typeof payload.footerSection === "string") {
      payload.footerSection = payload.footerSection.trim().toLowerCase() || null;
    }
    if (typeof payload.footerLabel === "string") {
      payload.footerLabel = payload.footerLabel.trim() || null;
    }
    if (payload.footerOrder !== undefined && payload.footerOrder !== null && payload.footerOrder !== "") {
      payload.footerOrder = Number(payload.footerOrder);
      if (!Number.isFinite(payload.footerOrder)) {
        return res.status(400).json({ error: "footerOrder must be a number" });
      }
    } else {
      payload.footerOrder = 0;
    }

    if (!payload.menuItemId && !payload.customPath) {
      return res.status(400).json({ error: "Select a menu item or provide a custom path" });
    }

    if (payload.showInFooter && !payload.footerSection) {
      return res.status(400).json({ error: "footerSection is required when assigning to footer" });
    }

    payload.status =
      typeof payload.status === "string"
        ? payload.status.toLowerCase()
        : payload.status;
    payload.publishedAt = payload.publishedAt
      ? new Date(payload.publishedAt)
      : null;
    if (payload.publishedAt && Number.isNaN(payload.publishedAt.getTime())) {
      return res.status(400).json({ error: "Invalid publishedAt" });
    }
    if (typeof payload.title === "string") {
      payload.title = payload.title.trim();
    }
    if (typeof payload.summary === "string") {
      payload.summary = payload.summary.trim() || null;
    }
    if (typeof payload.titleOr === "string") {
      payload.titleOr = payload.titleOr.trim() || null;
    }
    if (typeof payload.summaryOr === "string") {
      payload.summaryOr = payload.summaryOr.trim() || null;
    }
    if (typeof payload.bodyOr === "string" && payload.bodyOr.trim() === "") {
      payload.bodyOr = null;
    }
    if (
      typeof payload.heroImagePath === "string" &&
      payload.heroImagePath.trim() === ""
    ) {
      payload.heroImagePath = null;
    }

    if (
      payload.attachmentsPaths !== undefined &&
      !Array.isArray(payload.attachmentsPaths)
    ) {
      return res
        .status(400)
        .json({ error: "attachmentsPaths must be an array of strings" });
    }

    const page = await upsertPage({
      ...payload,
      adminUserId,
      actorRole: req.user?.role,
      ipAddress: req.ip,
    });
    return res.json({ data: page });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Unable to save page" });
  }
}
