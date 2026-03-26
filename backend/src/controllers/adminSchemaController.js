import { validationResult } from "express-validator";
import {
  createDynamicTable,
  listDynamicTables,
  updateDynamicTableSettings,
  insertDynamicRow,
  getDynamicTable,
  listDynamicRows,
  updateDynamicRow,
  deleteDynamicRow,
  uploadCmsFile,
  addDynamicColumn,
  dropDynamicColumn
} from "../services/adminSchemaService.js";

export async function createTable(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName, columns } = req.body || {};
    const result = await createDynamicTable({ tableName, columns });
    res.status(201).json({ data: result });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function listTables(req, res, next) {
  try {
    const data = await listDynamicTables();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getTable(req, res, next) {
  try {
    const { tableName } = req.params;
    const data = await getDynamicTable(tableName);
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function updateTableSettings(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName } = req.params;
    const { displayName, exposeFrontend, headerBgColor, headerTextColor, bodyTextColor } = req.body || {};
    const data = await updateDynamicTableSettings(tableName, {
      displayName,
      exposeFrontend,
      headerBgColor,
      headerTextColor,
      bodyTextColor
    });
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function insertRow(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName } = req.params;
    const { row } = req.body || {};
    const data = await insertDynamicRow(tableName, row);
    res.status(201).json({ data });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function listRows(req, res, next) {
  try {
    const { tableName } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const data = await listDynamicRows(tableName, limit);
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function updateRow(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName } = req.params;
    const { keys, changes } = req.body || {};
    const data = await updateDynamicRow(tableName, keys, changes);
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
}

export async function deleteRow(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName } = req.params;
    const { keys } = req.body || {};
    const data = await deleteDynamicRow(tableName, keys);
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
}

export async function uploadFile(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }
    const data = await uploadCmsFile(file);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function addColumn(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName } = req.params;
    const { column } = req.body || {};
    const data = await addDynamicColumn(tableName, column);
    res.status(201).json({ data });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function dropColumn(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid request", details: errors.array() });
  }

  try {
    const { tableName } = req.params;
    const { columnName } = req.body || {};
    const data = await dropDynamicColumn(tableName, columnName);
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}
