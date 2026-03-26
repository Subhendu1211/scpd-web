import { promises as fs } from "fs";
import path from "path";
import { validationResult } from "express-validator";
import {
  listSuccessStories,
  listSuccessStoryYears,
  createSuccessStory,
  deleteSuccessStory,
} from "../services/adminSuccessStoriesService.js";
import { mediaStorageRoot } from "../services/adminMediaService.js";

async function ensureMediaDirectory() {
  await fs.mkdir(mediaStorageRoot, { recursive: true });
}

/**
 * GET /admin/success-stories
 * Query params: ?year=2024
 */
export async function list(req, res) {
  try {
    const { year } = req.query;
    const items = await listSuccessStories(year || null);
    return res.json({ data: items });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || "Unable to list success stories" });
  }
}

/**
 * GET /admin/success-stories/years
 */
export async function years(_req, res) {
  try {
    const yearList = await listSuccessStoryYears();
    return res.json({ data: yearList });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || "Unable to list years" });
  }
}

/**
 * POST /admin/success-stories
 * Multipart: file + year + altText (optional)
 */
export async function upload(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const year = Number(req.body.year);
  if (!year || year < 1900 || year > 2100) {
    return res
      .status(400)
      .json({ error: "Valid year between 1900 and 2100 is required" });
  }

  await ensureMediaDirectory();

  const ext = path.extname(req.file.originalname || "");
  const safeExt = ext && /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : "";
  const finalFileName = `${req.file.filename}${safeExt}`;
  const absolutePath = path.resolve(mediaStorageRoot, finalFileName);
  await fs.rename(req.file.path, absolutePath);

  try {
    const imageUrl = `/uploads/media/${finalFileName}`;
    const record = await createSuccessStory({
      year,
      imageUrl,
      altText: req.body.altText || null,
      uploadedBy: req.user?.id || null,
    });

    return res.status(201).json({ data: record });
  } catch (error) {
    await fs.unlink(absolutePath).catch(() => {});
    return res
      .status(400)
      .json({ error: error.message || "Unable to save success story" });
  }
}

/**
 * DELETE /admin/success-stories/:id
 */
export async function remove(req, res) {
  const { id } = req.params;
  try {
    const deleted = await deleteSuccessStory(Number(id));
    if (!deleted) {
      return res.status(404).json({ error: "Success story not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || "Unable to delete success story" });
  }
}
