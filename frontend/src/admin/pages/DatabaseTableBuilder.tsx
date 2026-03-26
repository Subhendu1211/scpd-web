import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ColumnDataType,
  DynamicTableColumnInput,
  DynamicTableColumnSummary,
  DynamicTableDefinition,
  DynamicTableMeta,
  createDynamicTable,
  listDynamicTables,
  updateDynamicTableSettings,
  insertDynamicRow,
  getDynamicTable,
  fetchDynamicRows,
  updateDynamicRow,
  deleteDynamicRow,
  uploadCmsFile,
  addDynamicColumn,
  dropDynamicColumn,
} from "../api";
import { useAdminAuth } from "../auth";

const COLUMN_TYPE_OPTIONS: Array<{
  value: ColumnDataType;
  label: string;
  supportsLength?: boolean;
  supportsScale?: boolean;
}> = [
  { value: "uuid", label: "UUID" },
  { value: "text", label: "Text" },
  { value: "doc", label: "Doc (file URL)", supportsLength: false },
  { value: "varchar", label: "Varchar", supportsLength: true },
  { value: "integer", label: "Integer" },
  { value: "bigint", label: "BigInt" },
  { value: "numeric", label: "Numeric", supportsScale: true },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "timestamp", label: "Timestamp" },
  { value: "timestamptz", label: "Timestamp (TZ)" },
  { value: "jsonb", label: "JSONB" },
];

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const initialColumns: DynamicTableColumnInput[] = [
  { name: "id", type: "uuid", isPrimaryKey: true, nullable: false },
  {
    name: "created_at",
    type: "timestamptz",
    defaultValue: "now()",
    nullable: false,
  },
];

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const parseStoredDocValue = (value: string | undefined): string[] => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  return [raw];
};

const serializeStoredDocValue = (urls: string[]): string => {
  const cleaned = Array.from(
    new Set(
      urls
        .map((url) => String(url || "").trim())
        .filter(Boolean),
    ),
  );

  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
};

const DatabaseTableBuilder: React.FC = () => {
  const { user } = useAdminAuth();
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] =
    useState<DynamicTableColumnInput[]>(initialColumns);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTable, setCreatedTable] =
    useState<DynamicTableDefinition | null>(null);

  const [tables, setTables] = useState<DynamicTableMeta[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedMeta, setSelectedMeta] = useState<DynamicTableMeta | null>(
    null,
  );
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [rowValues, setRowValues] = useState<Record<string, string>>({});
  const [rowMessage, setRowMessage] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<Record<string, unknown> | null>(
    null,
  );
  const [editingValues, setEditingValues] = useState<Record<string, string>>(
    {},
  );
  const [rowActionPending, setRowActionPending] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [schemaActionMessage, setSchemaActionMessage] = useState<string | null>(
    null,
  );
  const [schemaActionError, setSchemaActionError] = useState<string | null>(
    null,
  );
  const [schemaActionPending, setSchemaActionPending] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState<DynamicTableColumnInput>({
    name: "",
    type: "text",
    nullable: true,
    isPrimaryKey: false,
  });

  const canManageSchema = useMemo(
    () => user?.role === "superadmin" || user?.role === "admin",
    [user],
  );

  useEffect(() => {
    if (canManageSchema) {
      loadTables();
    }
  }, [canManageSchema]);

  const loadTables = async () => {
    setLoadingTables(true);
    setSettingsMessage(null);
    setRowMessage(null);
    setRowsError(null);
    try {
      const data = await listDynamicTables();
      setTables(data);
      if (data.length && !selectedTable) {
        await selectTable(data[0].tableName);
      } else if (selectedTable) {
        const found = data.find((t) => t.tableName === selectedTable);
        if (!found) {
          setSelectedMeta(null);
          setRowValues({});
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load tables");
    } finally {
      setLoadingTables(false);
    }
  };

  const handleColumnChange = (
    index: number,
    field: keyof DynamicTableColumnInput,
    value: unknown,
  ) => {
    setColumns((prev) => {
      const next = [...prev];
      const updated = {
        ...next[index],
        [field]: value,
      } as DynamicTableColumnInput;

      if (field === "type") {
        const typeValue = value as ColumnDataType;
        if (typeValue !== "varchar") {
          delete updated.length;
        }
        if (typeValue !== "numeric") {
          delete updated.precision;
          delete updated.scale;
        }
        if (typeValue === "uuid") {
          updated.defaultValue = undefined;
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        name: `column_${prev.length + 1}`,
        type: "text",
        nullable: true,
        isPrimaryKey: false,
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleNewColumnChange = (
    field: keyof DynamicTableColumnInput,
    value: unknown,
  ) => {
    setNewColumn((prev) => {
      const next = { ...prev, [field]: value } as DynamicTableColumnInput;
      if (field === "type") {
        const typeValue = value as ColumnDataType;
        if (typeValue !== "varchar") {
          delete next.length;
        }
        if (typeValue !== "numeric") {
          delete next.precision;
          delete next.scale;
        }
        if (typeValue === "uuid") {
          next.defaultValue = undefined;
        }
      }
      return next;
    });
  };

  const validate = (): string | null => {
    if (!IDENTIFIER_REGEX.test(tableName.trim())) {
      return "Table name must start with a letter and use only letters, numbers, or underscores.";
    }

    if (!columns.length) {
      return "Add at least one column.";
    }

    const names = new Set<string>();
    let hasPrimary = false;

    for (const column of columns) {
      const name = column.name.trim();
      if (!IDENTIFIER_REGEX.test(name)) {
        return `Invalid column name: ${name || "<empty>"}.`;
      }
      if (names.has(name.toLowerCase())) {
        return `Duplicate column name: ${name}.`;
      }
      names.add(name.toLowerCase());
      if (column.isPrimaryKey) {
        hasPrimary = true;
      }
      if (column.type === "varchar") {
        const length = Number(column.length ?? 0);
        if (!Number.isInteger(length) || length < 1 || length > 255) {
          return "Varchar length must be between 1 and 255.";
        }
      }
      if (column.type === "numeric") {
        const precision =
          column.precision === undefined ? null : Number(column.precision);
        const scale =
          column.scale === undefined ? null : Number(column.scale ?? 0);
        if (
          precision !== null &&
          (!Number.isInteger(precision) || precision < 1 || precision > 38)
        ) {
          return "Numeric precision must be between 1 and 38.";
        }
        if (
          precision !== null &&
          scale !== null &&
          (!Number.isInteger(scale) || scale < 0 || scale > precision)
        ) {
          return "Numeric scale must be between 0 and precision.";
        }
      }
    }

    if (!hasPrimary) {
      return "Select at least one primary key column.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setCreatedTable(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    const payloadColumns = columns.map((col) => {
      const trimmedName = col.name.trim();
      const next: DynamicTableColumnInput = {
        name: trimmedName,
        type: col.type,
        nullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey,
      };

      if (col.type === "varchar" && col.length) {
        next.length = Number(col.length);
      }

      if (col.type === "numeric") {
        if (col.precision) {
          next.precision = Number(col.precision);
        }
        if (col.scale || col.scale === 0) {
          next.scale = Number(col.scale);
        }
      }

      if (col.defaultValue && `${col.defaultValue}`.trim()) {
        next.defaultValue = `${col.defaultValue}`.trim();
      }

      return next;
    });

    try {
      const data = await createDynamicTable({
        tableName: tableName.trim(),
        columns: payloadColumns,
      });
      setSuccess(`Created table "${data.tableName}" successfully.`);
      setCreatedTable(data);
      await loadTables();
      await selectTable(data.tableName);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        "Unable to create table. Please review your inputs.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectTable = async (name: string) => {
    setSelectedTable(name);
    setSelectedMeta(null);
    setRowValues({});
    setRowMessage(null);
    setRowError(null);
    setEditingKey(null);
    setEditingValues({});
    setRows([]);
    setSettingsMessage(null);
    if (!name) return;
    try {
      const data = await getDynamicTable(name);
      setSelectedMeta(data);
      const initialRows: Record<string, string> = {};
      data.columns
        .filter((col) => col.name !== "_ctid")
        .forEach((col) => {
          initialRows[col.name] = "";
        });
      setRowValues(initialRows);
      await loadTableRows(name);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load table definition");
    }
  };

  const loadTableRows = async (name?: string) => {
    const target = name || selectedTable;
    if (!target) return;
    setRowsLoading(true);
    setRowsError(null);
    try {
      const data = await fetchDynamicRows(target, 200);
      setRows(data.rows || []);
    } catch (err: any) {
      setRowsError(err?.response?.data?.error || "Unable to load rows");
    } finally {
      setRowsLoading(false);
    }
  };

  const handleRowChange = (column: string, value: string) => {
    setRowValues((prev) => ({ ...prev, [column]: value }));
  };

  const saveSettings = async () => {
    if (!selectedMeta) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const cleanColor = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      };

      const updated = await updateDynamicTableSettings(selectedMeta.tableName, {
        displayName: selectedMeta.displayName,
        exposeFrontend: selectedMeta.exposeFrontend,
        headerBgColor: cleanColor(selectedMeta.headerBgColor || null),
        headerTextColor: cleanColor(selectedMeta.headerTextColor || null),
        bodyTextColor: cleanColor(selectedMeta.bodyTextColor || null),
      });
      setSelectedMeta(updated);
      setSettingsMessage("Settings saved");
      await loadTables();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const parseValue = (type: ColumnDataType, value: string) => {
    if (value === "") return null;
    switch (type) {
      case "integer":
      case "bigint":
      case "numeric":
        return Number(value);
      case "boolean":
        return value === "true" || value === "1";
      case "jsonb":
        try {
          return JSON.parse(value);
        } catch {
          throw new Error("Invalid JSON");
        }
      default:
        return value;
    }
  };

  const validateAlterColumn = (
    col: DynamicTableColumnInput,
    existing: DynamicTableColumnSummary[],
  ) => {
    const trimmedName = col.name.trim();
    if (!IDENTIFIER_REGEX.test(trimmedName)) {
      return "Column name must start with a letter and use only letters, numbers, or underscores.";
    }
    if (
      existing.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      return `Column ${trimmedName} already exists.`;
    }
    if (existing.length >= 50) {
      return "Maximum column limit reached.";
    }
    if (col.type === "varchar") {
      const length = Number(col.length ?? 0);
      if (!Number.isInteger(length) || length < 1 || length > 255) {
        return "Varchar length must be between 1 and 255.";
      }
    }
    if (col.type === "numeric") {
      const precision =
        col.precision === undefined ? null : Number(col.precision);
      const scale = col.scale === undefined ? null : Number(col.scale ?? 0);
      if (
        precision !== null &&
        (!Number.isInteger(precision) || precision < 1 || precision > 38)
      ) {
        return "Numeric precision must be between 1 and 38.";
      }
      if (
        precision !== null &&
        scale !== null &&
        (!Number.isInteger(scale) || scale < 0 || scale > precision)
      ) {
        return "Numeric scale must be between 0 and precision.";
      }
    }
    if (col.isPrimaryKey) {
      return "Adding primary key columns via CMS is not supported.";
    }
    return null;
  };

  const addColumnToExisting = async () => {
    if (!selectedMeta) return;
    setSchemaActionMessage(null);
    setSchemaActionError(null);
    const validationError = validateAlterColumn(
      newColumn,
      selectedMeta.columns,
    );
    if (validationError) {
      setSchemaActionError(validationError);
      return;
    }

    const payload: DynamicTableColumnInput = {
      name: newColumn.name.trim(),
      type: newColumn.type,
      nullable: newColumn.nullable,
      isPrimaryKey: false,
    };
    if (newColumn.type === "varchar" && newColumn.length) {
      payload.length = Number(newColumn.length);
    }
    if (newColumn.type === "numeric") {
      if (newColumn.precision) payload.precision = Number(newColumn.precision);
      if (newColumn.scale || newColumn.scale === 0)
        payload.scale = Number(newColumn.scale);
    }
    if (newColumn.defaultValue && `${newColumn.defaultValue}`.trim()) {
      payload.defaultValue = `${newColumn.defaultValue}`.trim();
    }

    setSchemaActionPending(true);
    try {
      const updatedColumns = await addDynamicColumn(
        selectedMeta.tableName,
        payload,
      );
      setSelectedMeta((prev) =>
        prev ? { ...prev, columns: updatedColumns } : prev,
      );
      setSchemaActionMessage(`Added column "${payload.name}"`);
      setNewColumn({
        name: "",
        type: "text",
        nullable: true,
        isPrimaryKey: false,
      });
      setRowValues((prev) => ({ ...prev, [payload.name]: "" }));
      await loadTableRows(selectedMeta.tableName);
    } catch (err: any) {
      setSchemaActionError(
        err?.response?.data?.error || err?.message || "Unable to add column",
      );
    } finally {
      setSchemaActionPending(false);
    }
  };

  const dropColumnFromExisting = async (columnName: string) => {
    if (!selectedMeta) return;
    setSchemaActionMessage(null);
    setSchemaActionError(null);
    setSchemaActionPending(true);
    try {
      const updatedColumns = await dropDynamicColumn(
        selectedMeta.tableName,
        columnName,
      );
      setSelectedMeta((prev) =>
        prev ? { ...prev, columns: updatedColumns } : prev,
      );
      setRowValues((prev) => {
        const next = { ...prev };
        delete next[columnName];
        return next;
      });
      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[columnName];
        return next;
      });
      setSchemaActionMessage(`Dropped column "${columnName}"`);
      await loadTableRows(selectedMeta.tableName);
    } catch (err: any) {
      setSchemaActionError(
        err?.response?.data?.error || err?.message || "Unable to drop column",
      );
    } finally {
      setSchemaActionPending(false);
    }
  };

  const primaryColumns = useMemo(
    () => selectedMeta?.columns.filter((c) => c.isPrimaryKey) ?? [],
    [selectedMeta],
  );
  const effectivePrimary = useMemo(() => {
    if (primaryColumns.length) return primaryColumns;
    if (rows.length && (rows[0] as Record<string, unknown>)._ctid) {
      return [
        {
          name: "_ctid",
          type: "tid" as ColumnDataType,
          sqlType: "tid",
          isPrimaryKey: true,
          nullable: false,
          defaultValue: null,
        },
      ];
    }
    return [];
  }, [primaryColumns, rows]);

  const canModifyRows = effectivePrimary.length > 0;

  const buildKeyFromRow = (row: Record<string, unknown>) => {
    const key: Record<string, unknown> = {};
    effectivePrimary.forEach((col) => {
      key[col.name] = row[col.name];
    });
    return key;
  };

  const keySignature = (row: Record<string, unknown>) =>
    effectivePrimary.map((c) => `${c.name}:${row[c.name] ?? ""}`).join("|");

  const startEditRow = (row: Record<string, unknown>) => {
    if (!canModifyRows) return;
    setEditingKey(buildKeyFromRow(row));
    const next: Record<string, string> = {};
    selectedMeta?.columns
      .filter((col) => col.name !== "_ctid")
      .forEach((col) => {
        const value = row[col.name];
        next[col.name] =
          value === null || value === undefined
            ? ""
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);
      });
    setEditingValues(next);
    setRowMessage(null);
    setRowError(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditingValues({});
  };

  const saveEditRow = async () => {
    if (!selectedMeta || !editingKey || !canModifyRows) return;
    setRowActionPending(true);
    setRowMessage(null);
    setRowError(null);
    try {
      const changes: Record<string, unknown> = {};
      selectedMeta.columns
        .filter((c) => c.name !== "_ctid")
        .forEach((col) => {
          if (editingValues[col.name] !== undefined) {
            changes[col.name] = parseValue(col.type, editingValues[col.name]);
          }
        });
      const updated = await updateDynamicRow(
        selectedMeta.tableName,
        editingKey,
        changes,
      );
      setRowMessage(`Updated row (${Object.keys(editingKey).join(", ")})`);
      await loadTableRows();
      setEditingKey(null);
      setEditingValues({});
      return updated;
    } catch (err: any) {
      setRowError(
        err?.response?.data?.error || err?.message || "Unable to update row",
      );
    } finally {
      setRowActionPending(false);
    }
  };

  const handleDeleteRow = async (row: Record<string, unknown>) => {
    if (!selectedMeta || !canModifyRows) return;
    setRowActionPending(true);
    setRowMessage(null);
    setRowError(null);
    try {
      const keys = buildKeyFromRow(row);
      await deleteDynamicRow(selectedMeta.tableName, keys);
      setRowMessage(`Deleted row (${Object.keys(keys).join(", ")})`);
      await loadTableRows();
      if (editingKey && keySignature(row) === keySignature(editingKey)) {
        cancelEdit();
      }
    } catch (err: any) {
      setRowError(
        err?.response?.data?.error || err?.message || "Unable to delete row",
      );
    } finally {
      setRowActionPending(false);
    }
  };

  const insertRow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMeta) return;
    setRowMessage(null);
    setRowError(null);

    const generateUuid = () =>
      crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

    try {
      const payload: Record<string, unknown> = {};
      selectedMeta.columns.forEach((col) => {
        const rawValue = rowValues[col.name];
        const hasValue = rawValue !== undefined && rawValue !== "";

        if (hasValue) {
          payload[col.name] = parseValue(col.type, rawValue);
          return;
        }

        if (col.type === "uuid" && !col.nullable) {
          payload[col.name] = generateUuid();
        }
      });
      const result = await insertDynamicRow(selectedMeta.tableName, payload);
      setRowMessage(
        `Inserted row into ${selectedMeta.tableName} (keys: ${Object.keys(result).join(", ")})`,
      );
      setRowValues((prev) => {
        const reset = { ...prev };
        Object.keys(reset).forEach((k) => (reset[k] = ""));
        return reset;
      });
      await loadTableRows();
    } catch (err: any) {
      setRowError(
        err?.response?.data?.error || err?.message || "Unable to insert row",
      );
    }
  };

  const handleFileUpload = async (column: string, files: File[]) => {
    if (!files.length) return;
    setUploadingField(column);
    setRowError(null);
    try {
      const uploads = await Promise.all(files.map((file) => uploadCmsFile(file)));
      const uploadedUrls = uploads
        .map((res) => res.data?.data?.url)
        .filter((url): url is string => Boolean(url && url.trim()));

      if (!uploadedUrls.length) {
        setRowError(`Upload succeeded but no URL returned for ${column}`);
        return;
      }

      setRowValues((prev) => {
        const existing = parseStoredDocValue(prev[column]);
        const nextValue = serializeStoredDocValue([...existing, ...uploadedUrls]);
        return { ...prev, [column]: nextValue };
      });
      setRowMessage(`Uploaded ${uploadedUrls.length} file(s) for ${column}`);
    } catch (err: any) {
      setRowError(err?.response?.data?.error || "Unable to upload file");
    } finally {
      setUploadingField(null);
    }
  };

  const handleExcelImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMeta) return;

    setImportingExcel(true);
    setImportProgress("Reading file...");
    setRowError(null);
    setRowMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        { defval: "" },
      );

      if (!json.length) {
        throw new Error("Excel file is empty or invalid format.");
      }

      let successCount = 0;
      let errorCount = 0;

      const generateUuid = () =>
        crypto?.randomUUID
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

      for (let i = 0; i < json.length; i++) {
        setImportProgress(`Importing row ${i + 1} of ${json.length}...`);
        const excelRow = json[i];
        const payload: Record<string, unknown> = {};

        selectedMeta.columns.forEach((col) => {
          if (col.name === "_ctid") return;

          let rawValue = excelRow[col.name];
          if (rawValue === undefined || rawValue === "") {
            const lowerVal = excelRow[col.name.toLowerCase()];
            const upperVal = excelRow[col.name.toUpperCase()];
            rawValue =
              lowerVal !== undefined && lowerVal !== ""
                ? lowerVal
                : upperVal !== undefined && upperVal !== ""
                  ? upperVal
                  : undefined;
          }
          const hasValue =
            rawValue !== undefined && rawValue !== "" && rawValue !== null;

          if (hasValue) {
            try {
              payload[col.name] = parseValue(col.type, String(rawValue));
            } catch {
              payload[col.name] = rawValue;
            }
            return;
          }

          if (col.type === "uuid" && !col.nullable) {
            payload[col.name] = generateUuid();
          }
        });

        try {
          // Add a small delay so we don't completely lock the browser or hit extreme rate limits
          await new Promise((r) => setTimeout(r, 50));
          await insertDynamicRow(selectedMeta.tableName, payload);
          successCount++;
        } catch (e) {
          console.error(`Failed to insert row ${i + 1}:`, e);
          errorCount++;
        }
      }

      setRowMessage(
        `Excel import complete. Inserted: ${successCount}. Failed: ${errorCount}.`,
      );
      await loadTableRows();
    } catch (err: any) {
      setRowError(err?.message || "Failed to process Excel file.");
    } finally {
      setImportingExcel(false);
      setImportProgress(null);
      event.target.value = "";
    }
  };

  if (!canManageSchema) {
    return (
      <div className="admin-card">
        <h1>Database Tables</h1>
        <p>You do not have permission to manage database tables.</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>Database Tables</h1>
          <p>
            Create tables, expose them to the site, and populate initial data.
          </p>
        </div>
      </header>

      <section className="admin-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <label htmlFor="table-name">Table name</label>
          <input
            id="table-name"
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="e.g. cms_articles"
            required
          />

          <div className="admin-card-header" style={{ marginTop: "1rem" }}>
            <h2>Columns</h2>
            <button type="button" className="btn secondary" onClick={addColumn}>
              Add column
            </button>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Length / Precision</th>
                  <th>Nullable</th>
                  <th>Primary key</th>
                  <th>Default</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column, index) => {
                  const typeMeta = COLUMN_TYPE_OPTIONS.find(
                    (opt) => opt.value === column.type,
                  );
                  const showLength = typeMeta?.supportsLength;
                  const showScale = typeMeta?.supportsScale;

                  return (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) =>
                            handleColumnChange(index, "name", e.target.value)
                          }
                          required
                        />
                      </td>
                      <td>
                        <select
                          value={column.type}
                          onChange={(e) =>
                            handleColumnChange(
                              index,
                              "type",
                              e.target.value as ColumnDataType,
                            )
                          }
                        >
                          {COLUMN_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {showLength ? (
                          <input
                            type="number"
                            min={1}
                            max={255}
                            value={column.length ?? ""}
                            onChange={(e) =>
                              handleColumnChange(
                                index,
                                "length",
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              )
                            }
                            placeholder="Length"
                          />
                        ) : showScale ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                              type="number"
                              min={1}
                              max={38}
                              value={column.precision ?? ""}
                              onChange={(e) =>
                                handleColumnChange(
                                  index,
                                  "precision",
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                )
                              }
                              placeholder="Precision"
                            />
                            <input
                              type="number"
                              min={0}
                              max={38}
                              value={column.scale ?? ""}
                              onChange={(e) =>
                                handleColumnChange(
                                  index,
                                  "scale",
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                                )
                              }
                              placeholder="Scale"
                            />
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td>
                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={column.nullable ?? false}
                            onChange={(e) =>
                              handleColumnChange(
                                index,
                                "nullable",
                                e.target.checked,
                              )
                            }
                            disabled={column.isPrimaryKey}
                          />
                          <span className="sr-only">Nullable</span>
                        </label>
                      </td>
                      <td>
                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={column.isPrimaryKey ?? false}
                            onChange={(e) =>
                              handleColumnChange(
                                index,
                                "isPrimaryKey",
                                e.target.checked,
                              )
                            }
                          />
                          <span className="sr-only">Primary key</span>
                        </label>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={column.defaultValue ?? ""}
                          onChange={(e) =>
                            handleColumnChange(
                              index,
                              "defaultValue",
                              e.target.value,
                            )
                          }
                          placeholder="Numbers, true/false, now()"
                          disabled={column.type === "uuid"}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn link"
                          onClick={() => removeColumn(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="admin-help">
            Allowed defaults: numbers, true/false, and now()/current_timestamp
            for timestamp columns. Table and column names must use letters,
            numbers, or underscores.
          </p>

          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p className="admin-success">{success}</p> : null}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create table"}
          </button>
        </form>
      </section>

      {createdTable ? (
        <section className="admin-card">
          <h2>Created table summary</h2>
          <p>
            Table <strong>{createdTable.tableName}</strong> with{" "}
            {createdTable.columns.length} column
            {createdTable.columns.length === 1 ? "" : "s"}.
          </p>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Primary</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {createdTable.columns.map((col) => (
                  <tr key={col.name}>
                    <td>{col.name}</td>
                    <td>{col.sqlType}</td>
                    <td>{col.nullable ? "Yes" : "No"}</td>
                    <td>{col.isPrimaryKey ? "Yes" : "No"}</td>
                    <td>{col.defaultValue || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="admin-card">
        <div className="admin-card-header">
          <h2>Manage existing tables</h2>
          <button
            type="button"
            className="btn secondary"
            onClick={loadTables}
            disabled={loadingTables}
          >
            {loadingTables ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {tables.length === 0 ? <p>No dynamic tables yet.</p> : null}

        {tables.length ? (
          <div
            className="field-inline"
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <label htmlFor="table-select">Table</label>
            <select
              id="table-select"
              value={selectedTable}
              onChange={(e) => selectTable(e.target.value)}
            >
              <option value="">Select a table</option>
              {tables.map((tbl) => (
                <option key={tbl.tableName} value={tbl.tableName}>
                  {tbl.displayName || tbl.tableName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {selectedMeta ? (
          <>
            <div className="admin-grid" style={{ marginTop: "1rem" }}>
              <div className="admin-card">
                <h3>Settings</h3>
                <label htmlFor="display-name">Display name</label>
                <input
                  id="display-name"
                  type="text"
                  value={selectedMeta.displayName}
                  maxLength={120}
                  onChange={(e) =>
                    setSelectedMeta((prev) =>
                      prev ? { ...prev, displayName: e.target.value } : prev,
                    )
                  }
                />
                <label
                  className="admin-checkbox"
                  style={{ marginTop: "0.75rem" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMeta.exposeFrontend}
                    onChange={(e) =>
                      setSelectedMeta((prev) =>
                        prev
                          ? { ...prev, exposeFrontend: e.target.checked }
                          : prev,
                      )
                    }
                  />
                  <span>Expose to frontend</span>
                </label>

                <div
                  className="admin-grid"
                  style={{ marginTop: "1rem", gap: "0.75rem" }}
                >
                  <div className="admin-field">
                    <label htmlFor="header-bg-color">Header background</label>
                    <input
                      id="header-bg-color"
                      type="color"
                      value={selectedMeta.headerBgColor || "#1b6dd1"}
                      onChange={(e) =>
                        setSelectedMeta((prev) =>
                          prev
                            ? { ...prev, headerBgColor: e.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="header-text-color">Header text</label>
                    <input
                      id="header-text-color"
                      type="color"
                      value={selectedMeta.headerTextColor || "#ffffff"}
                      onChange={(e) =>
                        setSelectedMeta((prev) =>
                          prev
                            ? { ...prev, headerTextColor: e.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="body-text-color">Body text</label>
                    <input
                      id="body-text-color"
                      type="color"
                      value={selectedMeta.bodyTextColor || "#1b2f5b"}
                      onChange={(e) =>
                        setSelectedMeta((prev) =>
                          prev
                            ? { ...prev, bodyTextColor: e.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>
                {settingsMessage ? (
                  <p className="admin-success">{settingsMessage}</p>
                ) : null}
                <button
                  type="button"
                  className="btn"
                  onClick={saveSettings}
                  disabled={settingsSaving}
                >
                  {settingsSaving ? "Saving…" : "Save settings"}
                </button>
              </div>

              <div className="admin-card">
                <h3>Schema</h3>
                <p className="admin-help">
                  Add columns or drop non-primary columns. Primary keys cannot
                  be changed here.
                </p>
                {schemaActionError ? (
                  <p className="admin-error">{schemaActionError}</p>
                ) : null}
                {schemaActionMessage ? (
                  <p className="admin-success">{schemaActionMessage}</p>
                ) : null}
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Nullable</th>
                        <th>Primary</th>
                        <th>Default</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMeta.columns.map((col) => (
                        <tr key={col.name}>
                          <td>{col.name}</td>
                          <td>{col.sqlType}</td>
                          <td>{col.nullable ? "Yes" : "No"}</td>
                          <td>{col.isPrimaryKey ? "Yes" : "No"}</td>
                          <td>{col.defaultValue || "—"}</td>
                          <td>
                            <button
                              type="button"
                              className="btn link danger"
                              onClick={() => dropColumnFromExisting(col.name)}
                              disabled={
                                col.isPrimaryKey ||
                                col.name === "_ctid" ||
                                schemaActionPending
                              }
                            >
                              Drop
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  className="admin-card"
                  style={{ marginTop: "1rem", background: "#f8fafc" }}
                >
                  <h4>Add column</h4>
                  <div className="admin-grid" style={{ gap: "0.75rem" }}>
                    <div className="admin-field">
                      <label htmlFor="new-col-name">Name</label>
                      <input
                        id="new-col-name"
                        type="text"
                        value={newColumn.name}
                        onChange={(e) =>
                          handleNewColumnChange("name", e.target.value)
                        }
                        placeholder="e.g. summary"
                      />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="new-col-type">Type</label>
                      <select
                        id="new-col-type"
                        value={newColumn.type}
                        onChange={(e) =>
                          handleNewColumnChange(
                            "type",
                            e.target.value as ColumnDataType,
                          )
                        }
                      >
                        {COLUMN_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label>Length / Precision</label>
                      {(() => {
                        const typeMeta = COLUMN_TYPE_OPTIONS.find(
                          (opt) => opt.value === newColumn.type,
                        );
                        if (typeMeta?.supportsLength) {
                          return (
                            <input
                              type="number"
                              min={1}
                              max={255}
                              value={newColumn.length ?? ""}
                              onChange={(e) =>
                                handleNewColumnChange(
                                  "length",
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                )
                              }
                              placeholder="Length"
                            />
                          );
                        }
                        if (typeMeta?.supportsScale) {
                          return (
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="number"
                                min={1}
                                max={38}
                                value={newColumn.precision ?? ""}
                                onChange={(e) =>
                                  handleNewColumnChange(
                                    "precision",
                                    e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
                                  )
                                }
                                placeholder="Precision"
                              />
                              <input
                                type="number"
                                min={0}
                                max={38}
                                value={newColumn.scale ?? ""}
                                onChange={(e) =>
                                  handleNewColumnChange(
                                    "scale",
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                  )
                                }
                                placeholder="Scale"
                              />
                            </div>
                          );
                        }
                        return <span>—</span>;
                      })()}
                    </div>
                    <div className="admin-field">
                      <label className="admin-checkbox">
                        <input
                          type="checkbox"
                          checked={newColumn.nullable ?? false}
                          onChange={(e) =>
                            handleNewColumnChange("nullable", e.target.checked)
                          }
                        />
                        <span>Nullable</span>
                      </label>
                    </div>
                    <div className="admin-field">
                      <label htmlFor="new-col-default">Default</label>
                      <input
                        id="new-col-default"
                        type="text"
                        value={newColumn.defaultValue ?? ""}
                        onChange={(e) =>
                          handleNewColumnChange("defaultValue", e.target.value)
                        }
                        placeholder="Numbers, true/false, now()"
                        disabled={newColumn.type === "uuid"}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={addColumnToExisting}
                    disabled={schemaActionPending}
                  >
                    {schemaActionPending ? "Saving…" : "Add column"}
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3>Insert data</h3>
                <div>
                  <label
                    className="btn secondary"
                    style={{
                      margin: 0,
                      cursor: importingExcel ? "wait" : "pointer",
                    }}
                  >
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      style={{ display: "none" }}
                      onChange={handleExcelImport}
                      disabled={importingExcel}
                    />
                    {importingExcel ? "Importing..." : "Import from Excel"}
                  </label>
                </div>
              </div>
              {importProgress && (
                <p
                  style={{
                    margin: "0.5rem 0",
                    color: "#1b6dd1",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                >
                  {importProgress}
                </p>
              )}
              <form
                className="admin-form"
                onSubmit={insertRow}
                style={{ marginTop: "1rem" }}
              >
                <div className="admin-grid">
                  {selectedMeta.columns
                    .filter((col) => col.name !== "_ctid")
                    .map((col) => (
                      <div key={col.name} className="admin-field">
                        <label htmlFor={`col-${col.name}`}>{col.name}</label>
                        {col.type === "boolean" ? (
                          <select
                            id={`col-${col.name}`}
                            value={rowValues[col.name] ?? ""}
                            onChange={(e) =>
                              handleRowChange(col.name, e.target.value)
                            }
                          >
                            <option value="">—</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : col.type === "jsonb" ? (
                          <textarea
                            id={`col-${col.name}`}
                            value={rowValues[col.name] ?? ""}
                            onChange={(e) =>
                              handleRowChange(col.name, e.target.value)
                            }
                            placeholder={'{ "key": "value" }'}
                            rows={3}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <input
                              id={`col-${col.name}`}
                              type={
                                col.type === "integer" ||
                                col.type === "bigint" ||
                                col.type === "numeric"
                                  ? "number"
                                  : "text"
                              }
                              value={rowValues[col.name] ?? ""}
                              onChange={(e) =>
                                handleRowChange(col.name, e.target.value)
                              }
                              placeholder={
                                col.defaultValue
                                  ? `Default ${col.defaultValue}`
                                  : ""
                              }
                              style={{ flex: 1 }}
                            />
                            {col.type === "doc" ? (
                              <label
                                className="btn secondary"
                                style={{ margin: 0 }}
                              >
                                <input
                                  type="file"
                                  multiple
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const files = Array.from(
                                      e.target.files ?? [],
                                    );
                                    if (files.length > 0) {
                                      void handleFileUpload(col.name, files);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                {uploadingField === col.name
                                  ? "Uploading…"
                                  : "Upload photo(s)"}
                              </label>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {rowError ? (
                  <p className="admin-error" role="alert">
                    {rowError}
                  </p>
                ) : null}
                {rowMessage ? (
                  <p className="admin-success">{rowMessage}</p>
                ) : null}

                <button type="submit" className="btn">
                  Insert row
                </button>
              </form>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Rows (first 200)</h3>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => loadTableRows()}
                  disabled={rowsLoading}
                >
                  {rowsLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              {rowsError ? (
                <p className="admin-error" role="alert">
                  {rowsError}
                </p>
              ) : null}
              {rowsLoading ? <p>Loading rows…</p> : null}
              {!rowsLoading && !rows.length ? <p>No rows found.</p> : null}

              {!rowsLoading && rows.length ? (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {selectedMeta.columns
                          .filter((col) => col.name !== "_ctid")
                          .map((col) => (
                            <th key={col.name}>{col.name}</th>
                          ))}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const signature = keySignature(row);
                        const isEditing = editingKey
                          ? keySignature(editingKey) === signature
                          : false;

                        return (
                          <tr key={signature || idx}>
                            {selectedMeta.columns
                              .filter((col) => col.name !== "_ctid")
                              .map((col) => (
                                <td key={`${signature}-${col.name}`}>
                                  {isEditing ? (
                                    col.type === "boolean" ? (
                                      <select
                                        value={editingValues[col.name] ?? ""}
                                        onChange={(e) =>
                                          setEditingValues((prev) => ({
                                            ...prev,
                                            [col.name]: e.target.value,
                                          }))
                                        }
                                      >
                                        <option value="">—</option>
                                        <option value="true">true</option>
                                        <option value="false">false</option>
                                      </select>
                                    ) : col.type === "jsonb" ? (
                                      <textarea
                                        value={editingValues[col.name] ?? ""}
                                        onChange={(e) =>
                                          setEditingValues((prev) => ({
                                            ...prev,
                                            [col.name]: e.target.value,
                                          }))
                                        }
                                        rows={3}
                                      />
                                    ) : (
                                      <input
                                        type={
                                          col.type === "integer" ||
                                          col.type === "bigint" ||
                                          col.type === "numeric"
                                            ? "number"
                                            : "text"
                                        }
                                        value={editingValues[col.name] ?? ""}
                                        onChange={(e) =>
                                          setEditingValues((prev) => ({
                                            ...prev,
                                            [col.name]: e.target.value,
                                          }))
                                        }
                                      />
                                    )
                                  ) : (
                                    <span>
                                      {formatCellValue(row[col.name])}
                                    </span>
                                  )}
                                </td>
                              ))}
                            <td style={{ minWidth: "140px" }}>
                              {!canModifyRows ? (
                                <span className="admin-help">
                                  Add a primary key to enable edit/delete.
                                </span>
                              ) : isEditing ? (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    type="button"
                                    className="btn small"
                                    onClick={saveEditRow}
                                    disabled={rowActionPending}
                                  >
                                    {rowActionPending ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn secondary small"
                                    onClick={cancelEdit}
                                    disabled={rowActionPending}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    type="button"
                                    className="btn link"
                                    onClick={() => startEditRow(row)}
                                    disabled={!canModifyRows}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn link danger"
                                    onClick={() => handleDeleteRow(row)}
                                    disabled={
                                      rowActionPending || !canModifyRows
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default DatabaseTableBuilder;
