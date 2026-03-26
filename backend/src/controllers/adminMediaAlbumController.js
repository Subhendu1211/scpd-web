import { validationResult } from "express-validator";
import {
  listMediaAlbums,
  createMediaAlbum,
  updateMediaAlbum,
  deleteMediaAlbum
} from "../services/adminMediaService.js";

export async function list(req, res, next) {
  try {
    const albums = await listMediaAlbums();
    return res.json({ data: albums });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, sortOrder, coverMediaId } = req.body;

  const parsedSortOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? 0
      : Number(sortOrder);
  const parsedCover =
    coverMediaId === undefined || coverMediaId === null || coverMediaId === ""
      ? null
      : Number(coverMediaId);

  try {
    const album = await createMediaAlbum({
      name,
      description,
      sortOrder: Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
      coverMediaId: Number.isNaN(parsedCover) ? null : parsedCover
    });
    return res.status(201).json({ data: album });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, description, sortOrder, coverMediaId } = req.body;

  const parsedSortOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? undefined
      : Number(sortOrder);
  const parsedCover =
    coverMediaId === undefined || coverMediaId === null || coverMediaId === ""
      ? null
      : Number(coverMediaId);

  try {
    const album = await updateMediaAlbum(Number(id), {
      name,
      description,
      sortOrder: parsedSortOrder,
      coverMediaId: Number.isNaN(parsedCover) ? null : parsedCover
    });

    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    return res.json({ data: album });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  const { id } = req.params;
  try {
    const removed = await deleteMediaAlbum(Number(id));
    if (!removed) {
      return res.status(404).json({ error: "Album not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
