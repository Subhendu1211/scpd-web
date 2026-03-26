import { promises as fs } from "fs";
import path from "path";
import { appendFileSync } from "fs";
import { validationResult } from "express-validator";
import {
  listMedia,
  createMediaRecord,
  deleteMediaRecord,
  updateMediaRecord,
  mediaStorageRoot
} from "../services/adminMediaService.js";

async function ensureMediaDirectory() {
  await fs.mkdir(mediaStorageRoot, { recursive: true });
}

export async function list(req, res) {
  const items = await listMedia();
  return res.json({ data: items });
}

export async function upload(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  await ensureMediaDirectory();

  // Preserve the original extension so the static server sets the correct Content-Type
  const ext = path.extname(req.file.originalname || "");
  const safeExt = ext && /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : "";
  const finalFileName = `${req.file.filename}${safeExt}`;
  const absolutePath = path.resolve(mediaStorageRoot, finalFileName);
  await fs.rename(req.file.path, absolutePath);

  const fileBytes = await fs.readFile(absolutePath);

  try {
    const record = await createMediaRecord({
      fileName: finalFileName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      category: req.body.category,
      sizeBytes: req.file.size,
      storagePath: absolutePath,
      fileBytes,
      altText: req.body.altText,
      captionTextColor: req.body.captionTextColor,
      uploadedBy: req.user?.id,
      albumId: req.body.category === "photo" && req.body.albumId ? Number(req.body.albumId) : null
    });

    return res.status(201).json({ data: record });
  } catch (error) {
    appendFileSync("upload_error.log", `${new Date().toISOString()} - Upload Error: ${error.stack || error.message}\n`);
    await fs.unlink(absolutePath).catch(() => { });
    return res.status(400).json({ error: error.message || "Unable to store media" });
  }
}

export async function uploadBulk(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  await ensureMediaDirectory();

  const results = [];
  const failed = [];

  for (const file of files) {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext && /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : "";
    const finalFileName = `${file.filename}${safeExt}`;
    const absolutePath = path.resolve(mediaStorageRoot, finalFileName);

    try {
      await fs.rename(file.path, absolutePath);
      const fileBytes = await fs.readFile(absolutePath);

      const record = await createMediaRecord({
        fileName: finalFileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        category: req.body.category,
        sizeBytes: file.size,
        storagePath: absolutePath,
        fileBytes,
        altText: req.body[`altText_${file.originalname}`] || req.body.altText || null,
        captionTextColor: req.body.captionTextColor || null,
        uploadedBy: req.user?.id,
        albumId: req.body.category === "photo" && req.body.albumId ? Number(req.body.albumId) : null,
      });
      results.push(record);
    } catch (err) {
      appendFileSync("upload_error.log", `${new Date().toISOString()} - Bulk Upload Error: ${err.stack || err.message}\n`);
      await fs.unlink(absolutePath).catch(() => {});
      failed.push({ name: file.originalname, error: err.message || "Upload failed" });
    }
  }

  if (results.length === 0) {
    return res.status(400).json({ error: "All uploads failed", failed });
  }

  return res.status(201).json({ data: results, failed });
}

export async function remove(req, res) {
  const { id } = req.params;
  const deleted = await deleteMediaRecord(Number(id));
  if (!deleted) {
    return res.status(404).json({ error: "Media not found" });
  }
  return res.status(204).send();
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const payload = {};

  if (req.body.altText !== undefined) {
    payload.altText = req.body.altText;
  }

  if (req.body.albumId !== undefined) {
    payload.albumId = req.body.albumId === null || req.body.albumId === ""
      ? null
      : Number(req.body.albumId);
  }

  if (req.body.captionTextColor !== undefined) {
    payload.captionTextColor = req.body.captionTextColor;
  }

  if (req.body.category !== undefined) {
    payload.category = req.body.category;
  }

  try {
    const record = await updateMediaRecord(Number(id), payload);
    if (!record) {
      return res.status(404).json({ error: "Media not found" });
    }

    return res.json({ data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update media";
    return res.status(400).json({ error: message });
  }
}
