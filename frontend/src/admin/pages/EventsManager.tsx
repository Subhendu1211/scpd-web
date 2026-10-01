import React, { useEffect, useMemo, useState } from "react";
import {
  createDynamicTable,
  deleteDynamicRow,
  fetchDynamicRows,
  fetchMenuTree,
  fetchPageByMenu,
  insertDynamicRow,
  listDynamicTables,
  updateDynamicRow,
  updateDynamicTableSettings,
  uploadCmsFile,
  upsertPage,
  type DynamicTableMeta,
  type DynamicTableColumnInput,
} from "../api";

type EventRow = {
  id: string;
  created_at?: string;
  sort_order?: number;
  is_active?: boolean;
  image?: string | null;
  caption?: string | null;
  date?: string | null;
  location?: string | null;
};

type MenuOption = {
  id: number;
  label: string;
  path: string;
};

type TargetConfig = {
  key: string;
  label: string;
  pagePath: string;
  tableName: string;
  intro: string;
};

const INTRO_TEXT =
  "Add events with caption, date, location, and multiple photos. Select any menu page, create a table, and link it to that page.";

const LEGACY_TABLE_BY_PATH: Record<string, string> = {
  "/events/workshops-awareness": "workshops_awareness_events",
  "/events": "homepage_events",
  "/events/camp-courts": "camp_courts_events",
  "/events/quiz-competitions": "quiz_competitions_events",
  "/events/sakhyama-ability-talk": "sakhyama_ability_talk_events",
  "/events/disability-friendly-campaign": "disability_friendly_campaign_events",
};

const TARGETS: TargetConfig[] = [
  {
    key: "workshops-awareness",
    label: "Workshops & Awareness",
    pagePath: "/events/workshops-awareness",
    tableName: LEGACY_TABLE_BY_PATH["/events/workshops-awareness"],
    intro: "Publish workshops and awareness programs that relate to the department's outreach efforts.",
  },
  {
    key: "homepage-events",
    label: "Homepage Events",
    pagePath: "/events",
    tableName: LEGACY_TABLE_BY_PATH["/events"],
    intro: "Keep the SCPD homepage events section up to date.",
  },
  {
    key: "camp-courts",
    label: "Camp Courts",
    pagePath: "/events/camp-courts",
    tableName: LEGACY_TABLE_BY_PATH["/events/camp-courts"],
    intro: "Manage camps and courts related schedules.",
  },
  {
    key: "quiz-competitions",
    label: "Quiz Competitions",
    pagePath: "/events/quiz-competitions",
    tableName: LEGACY_TABLE_BY_PATH["/events/quiz-competitions"],
    intro: "Update quiz and competition event listings.",
  },
  {
    key: "sakhyama-ability-talk",
    label: "Sakhyama Ability Talk",
    pagePath: "/events/sakhyama-ability-talk",
    tableName: LEGACY_TABLE_BY_PATH["/events/sakhyama-ability-talk"],
    intro: "Schedule Sakhyama ability talk sessions.",
  },
  {
    key: "disability-friendly-campaign",
    label: "Disability-friendly Campaign",
    pagePath: "/events/disability-friendly-campaign",
    tableName: LEGACY_TABLE_BY_PATH["/events/disability-friendly-campaign"],
    intro: "Track disability-friendly campaign outreach.",
  },
];

const DEFAULT_TARGET_KEY = TARGETS[0].key;

const toText = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function parseImageList(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((v) => String(v || "").trim()).filter(Boolean)),
    );
  }

  const raw = String(value).trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(parsed.map((v) => String(v || "").trim()).filter(Boolean)),
        );
      }
    } catch {
      // Keep plain string path.
    }
  }

  return [raw];
}

function serializeImageList(urls: string[]): string | null {
  const cleaned = Array.from(
    new Set(urls.map((u) => String(u || "").trim()).filter(Boolean)),
  );

  if (cleaned.length === 0) return null;
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
}

function flattenMenu(items: any[]): any[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenMenu(item.children) : []),
  ]);
}

function toSlug(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toEventTableName(path: string, label: string): string {
  const legacy = LEGACY_TABLE_BY_PATH[String(path || "").trim()];
  if (legacy) return legacy;

  const pathSeed = String(path || "").replace(/^\/+/, "");
  let base = toSlug(pathSeed || label || "events");
  if (!base) base = "events";
  if (!/^[a-z_]/.test(base)) {
    base = `t_${base}`;
  }
  if (!base.endsWith("_events")) {
    base = `${base}_events`;
  }
  if (base.length > 63) {
    const suffix = "_events";
    base = `${base.slice(0, 63 - suffix.length).replace(/_+$/g, "")}${suffix}`;
  }
  return base;
}

function toDisplayName(label: string, tableName: string): string {
  const cleanLabel = String(label || "").trim();
  if (cleanLabel) return `${cleanLabel} Events`;
  return tableName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function isEventLikeTable(meta: DynamicTableMeta): boolean {
  const names = new Set(
    (meta.columns || []).map((col) => String(col?.name || "").toLowerCase()),
  );
  return (
    names.has("id") &&
    names.has("image") &&
    names.has("caption") &&
    names.has("date") &&
    names.has("location")
  );
}

const EventsManager: React.FC = () => {
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | "">("");
  const [tableName, setTableName] = useState("");
  const [tableDisplayName, setTableDisplayName] = useState("");
  const [tableOptions, setTableOptions] = useState<
    Array<{ tableName: string; displayName: string }>
  >([]);
  const selectedMenu = useMemo(
    () => menuOptions.find((item) => item.id === selectedMenuId) || null,
    [menuOptions, selectedMenuId],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  const [setupBusy, setSetupBusy] = useState(false);
  const [targetKey, setTargetKey] = useState<string>(DEFAULT_TARGET_KEY);
  const selectedTarget = useMemo(
    () => TARGETS.find((item) => item.key === targetKey) ?? TARGETS[0],
    [targetKey],
  );

  const canUseCryptoUuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";

  const loadTableOptions = async () => {
    try {
      const tables = await listDynamicTables();
      const options = tables
        .filter((table) => isEventLikeTable(table) || /_events$/i.test(table.tableName))
        .map((table) => ({
          tableName: table.tableName,
          displayName: table.displayName || table.tableName,
        }));
      setTableOptions(options);
    } catch {
      // Keep table suggestions best-effort.
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tree = await fetchMenuTree();
        const all = flattenMenu(tree as any[]);
        const options: MenuOption[] = all
          .filter((item) => Number.isFinite(Number(item?.id)))
          .map((item) => ({
            id: Number(item.id),
            label: String(item.label || "").trim() || String(item.path || "").trim(),
            path: String(item.path || "").trim(),
          }))
          .filter((item) => item.path && !item.path.startsWith("/admin"));

        if (!alive) return;

        setMenuOptions(options);
        setSelectedMenuId((prev) => {
          if (prev !== "" && options.some((item) => item.id === prev)) {
            return prev;
          }
          const preferred = options.find(
            (item) => item.path === "/events/workshops-awareness"
          );
          return preferred?.id ?? (options[0]?.id ?? "");
        });
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.error || "Unable to load menu pages");
      }
      await loadTableOptions();
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOptions.length) return;
    const match = menuOptions.find(
      (item) => String(item.path || "").trim() === selectedTarget.pagePath,
    );
    if (match?.id && match.id !== selectedMenuId) {
      setSelectedMenuId(match.id);
    }
  }, [menuOptions, selectedMenuId, selectedTarget.pagePath]);

  useEffect(() => {
    if (selectedMenuId === "") {
      setTableName("");
      setTableDisplayName("");
      setRows([]);
      return;
    }

    const menu = menuOptions.find((item) => item.id === selectedMenuId);
    if (!menu) return;

    let alive = true;
    (async () => {
      const fallbackTableName = toEventTableName(menu.path, menu.label);
      let nextTableName = fallbackTableName;
      try {
        const existing = await fetchPageByMenu(menu.id);
        if (existing?.dynamicTableName && String(existing.dynamicTableName).trim()) {
          nextTableName = String(existing.dynamicTableName).trim();
        }
      } catch {
        // Keep fallback defaults when page does not exist yet.
      }

      if (!alive) return;
      setTableName(nextTableName);
      setTableDisplayName(toDisplayName(menu.label, nextTableName));
      setMessage(null);
    })();

    return () => {
      alive = false;
    };
  }, [selectedMenuId, menuOptions]);

  const resetForm = () => {
    setCaption("");
    setDate("");
    setLocation("");
    setSortOrder("0");
    setIsActive(true);
    setImageUrls([]);
    setEditingRowId(null);
  };

  const handleEdit = (row: EventRow) => {
    setCaption(row.caption || "");
    setDate(row.date || "");
    setLocation(row.location || "");
    setSortOrder(String(row.sort_order ?? 0));
    setIsActive(row.is_active !== false);
    setImageUrls(parseImageList(row.image));
    setEditingRowId(row.id || null);
    setMessage(null);
    setError(null);
  };

  const load = async () => {
    const activeTable = tableName.trim();
    if (!activeTable) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchDynamicRows(activeTable, 200);
      setRows((data.rows || []) as EventRow[]);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) {
        setRows([]);
        setMessage(
          `Table "${selectedTarget.tableName}" does not exist yet. Click "Create events table".`,
        );
      } else {
        setError(err?.response?.data?.error || "Unable to load events");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tableName]);

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    setImageUploading(true);
    setError(null);
    setMessage(null);

    try {
      const uploads = await Promise.all(
        files.map((file) => uploadCmsFile(file)),
      );
      const newUrls = uploads
        .map((res) => res.data?.data?.url)
        .filter((url): url is string => Boolean(url && url.trim()));

      if (!newUrls.length) {
        setError("Upload finished but no file URL was returned.");
        return;
      }

      setImageUrls((prev) => Array.from(new Set([...prev, ...newUrls])));
      setMessage(`${newUrls.length} photo(s) uploaded. Click Save event.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  const ensureTable = async () => {
    const activeTable = tableName.trim();
    const activeDisplayName =
      tableDisplayName.trim() ||
      toDisplayName(selectedMenu?.label || "", activeTable);
    if (!activeTable) {
      setError("Select a page first. Table name will be filled automatically.");
      return;
    }

    setSetupBusy(true);
    setError(null);
    setMessage(null);
    try {
      const columns: DynamicTableColumnInput[] = [
        { name: "id", type: "uuid", isPrimaryKey: true, nullable: false },
        {
          name: "created_at",
          type: "timestamptz",
          defaultValue: "now()",
          nullable: false,
        },
        {
          name: "sort_order",
          type: "integer",
          defaultValue: "0",
          nullable: false,
        },
        {
          name: "is_active",
          type: "boolean",
          defaultValue: "true",
          nullable: false,
        },
        { name: "image", type: "doc", nullable: true },
        { name: "caption", type: "text", nullable: true },
        { name: "date", type: "text", nullable: true },
        { name: "location", type: "text", nullable: true },
      ];

      await createDynamicTable({ tableName: activeTable, columns });
      await updateDynamicTableSettings(activeTable, {
        displayName: activeDisplayName,
        exposeFrontend: true,
      });
      setMessage(`Created table "${activeTable}".`);
      await load();
      await loadTableOptions();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Unable to create events table";
      if (/already exists/i.test(msg)) {
        try {
          await updateDynamicTableSettings(activeTable, {
            displayName: activeDisplayName,
            exposeFrontend: true,
          });
        } catch {
          // ignore
        }
        setMessage(`Table "${activeTable}" already exists.`);
        await load();
        await loadTableOptions();
      } else {
        setError(msg);
      }
    } finally {
      setSetupBusy(false);
    }
  };

  const linkTableToPage = async () => {
    const activeTable = tableName.trim();
    if (!selectedMenu || selectedMenuId === "") {
      setError("Select a page to link.");
      return;
    }
    if (!activeTable) {
      setError("Table name is required.");
      return;
    }

    setSetupBusy(true);
    setError(null);
    setMessage(null);

    try {
      const tree = await fetchMenuTree();
      const all = flattenMenu(tree as any[]);
      const pageMenu = all.find(
        (m) => String(m.path || "").trim() === selectedTarget.pagePath,
      );

      if (!pageMenu?.id) {
        setError(
          `Menu item with path "${selectedTarget.pagePath}" not found. Create it first in Admin > Navigation.`,
        );
        return;
      }

      const existing = await fetchPageByMenu(pageMenu.id);
      const payload = {
        menuItemId: selectedMenu.id,
        title: existing?.title || selectedMenu.label,
        summary: existing?.summary ?? "",
        body: existing?.body ?? "",
        titleOr: existing?.titleOr ?? "",
        summaryOr: existing?.summaryOr ?? "",
        bodyOr: existing?.bodyOr ?? "",
        heroImagePath: existing?.heroImagePath ?? null,
        heroImagePaths: existing?.heroImagePaths ?? [],
        heroImageCaptions: existing?.heroImageCaptions ?? [],
        attachmentsPaths: existing?.attachmentsPaths ?? [],
        attachmentsCaptions: existing?.attachmentsCaptions ?? [],
        status: existing?.status || "draft",
        publishedAt: existing?.publishedAt ?? null,
        showPublishDate: Boolean(existing?.showPublishDate),
        dynamicTableName: activeTable,
        fontFamily: existing?.fontFamily ?? "",
        fontColor: existing?.fontColor ?? "",
        backgroundColor: existing?.backgroundColor ?? "",
        pageLayout: existing?.pageLayout ?? "default",
      };

      await upsertPage(payload as any);
      setMessage(`Linked "${selectedTarget.tableName}" to ${selectedTarget.pagePath}.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to link table to page");
    } finally {
      setSetupBusy(false);
    }
  };

  const publishPageNow = async () => {
    setSetupBusy(true);
    setError(null);
    setMessage(null);

    try {
      const tree = await fetchMenuTree();
      const all = flattenMenu(tree as any[]);
      const pageMenu = all.find(
        (m) => String(m.path || "").trim() === selectedTarget.pagePath,
      );

      if (!pageMenu?.id) {
        setError(`Menu item with path "${selectedTarget.pagePath}" not found.`);
        return;
      }

      const existing = await fetchPageByMenu(pageMenu.id);
      if (!existing || !existing.id) {
        setError("Page not found. Link table to page first.");
        return;
      }

      const payload = {
        ...existing,
        status: "published",
        publishedAt: existing.publishedAt || new Date().toISOString(),
      };

      await upsertPage(payload as any);
      setMessage(`Page "${selectedTarget.pagePath}" is now published.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to publish page");
    } finally {
      setSetupBusy(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTable = tableName.trim();
    if (!activeTable) {
      setError("Table name is required before saving events.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const changes = {
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
        image: serializeImageList(imageUrls),
        caption: caption.trim() || null,
        date: date.trim() || null,
        location: location.trim() || null,
      };

      if (editingRowId) {
        await updateDynamicRow(activeTable, { id: editingRowId }, changes as any);
        setMessage("Event updated.");
      } else {
        const fallbackId = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
        const payload: EventRow = {
          id: canUseCryptoUuid ? crypto.randomUUID() : fallbackId,
          ...changes,
        };
        await insertDynamicRow(activeTable, payload as any);
        setMessage("Event saved.");
      }

      resetForm();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: EventRow) => {
    const activeTable = tableName.trim();
    if (!row?.id) return;
    if (!window.confirm("Delete this event?")) return;
    if (!activeTable) return;

    setError(null);
    setMessage(null);
    try {
      await deleteDynamicRow(activeTable, { id: row.id });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setMessage("Event deleted.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to delete event");
    }
  };

  const updateSortOrder = async (row: EventRow, nextSort: number) => {
    const activeTable = tableName.trim();
    if (!activeTable) return;
    setError(null);
    setMessage(null);
    try {
      await updateDynamicRow(activeTable, { id: row.id }, { sort_order: nextSort });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, sort_order: nextSort } : r)));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to update sort order");
    }
  };

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString() : "-";

  const sortedRows = useMemo(() => {
    const clone = [...rows];
    clone.sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      const ad = a.created_at ? Date.parse(a.created_at) : 0;
      const bd = b.created_at ? Date.parse(b.created_at) : 0;
      return bd - ad;
    });
    return clone;
  }, [rows]);

  return (
    <div className="admin-main">
      <header className="admin-header--premium animate-fade-in-up">
        <div className="admin-header__content">
          <div className="admin-header__info">
            <h1>Events Manager</h1>
            <p className="admin-header__subtitle">{selectedTarget.intro}</p>
          </div>
          <div className="admin-header__actions">
            <button
              type="button"
              className="btn secondary"
              onClick={load}
              disabled={loading || setupBusy}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.2)",
              }}
            >
              Refresh Data
            </button>
            <button
              type="button"
              className="btn"
              onClick={publishPageNow}
              disabled={setupBusy}
              style={{ background: "#fff", color: "#1e3a8a" }}
            >
              {setupBusy ? "Publishing..." : "Publish Page Now"}
            </button>
          </div>
        </div>
      </header>

      <div className="admin-content-inner">
        <div
          className="admin-form glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="admin-panel-header">
            <h3>Configuration & Target</h3>
            <p>
              Select the program area you want to manage and ensure the backend
              infrastructure is ready.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
              marginTop: "1.5rem",
            }}
          >
            <label
              className="admin-field"
              style={{ marginBottom: 0, minWidth: 320, flex: 1 }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "#1e3a8a",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Program Management Area
              </span>
                <select
                  className="admin-select"
                  value={selectedTarget.key}
                  onChange={(e) =>
                    setTargetKey(e.target.value as TargetConfig["key"])
                  }
                  disabled={setupBusy || loading}
                >
                {TARGETS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={ensureTable}
                disabled={setupBusy}
                style={{ borderColor: "rgba(30, 64, 175, 0.2)" }}
              >
                {setupBusy ? "Initializing..." : "Seed Infrastructure"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={linkTableToPage}
                disabled={setupBusy}
              >
                {setupBusy ? "Linking..." : `Connect to ${selectedTarget.pagePath}`}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="admin-alert admin-alert--error">{error}</div>
        ) : null}
        {message ? (
          <div className="admin-alert admin-alert--success">{message}</div>
        ) : null}

        <section
          className="admin-panel glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="admin-panel-header">
            <h3>Create New Event</h3>
            <p>
              Add a new milestone or awareness program to the selected target
              area.
            </p>
          </div>

          <form
            className="admin-form"
            onSubmit={handleSaveEvent}
            style={{ marginTop: "1.5rem" }}
          >
            <div
              className="admin-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div className="admin-field">
                <label htmlFor="event-caption">Event Caption</label>
                <input
                  id="event-caption"
                  className="admin-input"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Awareness Programme at..."
                />
                <span className="admin-help">
                  Short descriptive title for the event.
                </span>
              </div>

              <div className="admin-field">
                <label htmlFor="event-date">Display Date</label>
                <input
                  id="event-date"
                  className="admin-input"
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. 15th January, 2025"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="event-location">Location</label>
                <input
                  id="event-location"
                  className="admin-input"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Conference Hall..."
                />
              </div>

              <div
                className="admin-grid"
                style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
              >
                <div className="admin-field">
                  <label htmlFor="event-sort">Sort Order</label>
                  <input
                    id="event-sort"
                    className="admin-input"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    min={0}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="event-active">Visibility</label>
                  <select
                    id="event-active"
                    className="admin-select"
                    value={isActive ? "1" : "0"}
                    onChange={(e) => setIsActive(e.target.value === "1")}
                  >
                    <option value="1">Visible (Active)</option>
                    <option value="0">Hidden (Draft)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "2rem" }}>
              <label
                style={{
                  fontWeight: 600,
                  color: "#1e3a8a",
                  display: "block",
                  marginBottom: "1rem",
                }}
              >
                Event Media (Photos & PDFs)
              </label>

              <div
                className="premium-upload-zone"
                style={{
                  padding: "2rem",
                  border: "2px dashed rgba(30, 64, 175, 0.1)",
                  borderRadius: "16px",
                  background: "rgba(30, 64, 175, 0.02)",
                  textAlign: "center",
                }}
              >
                <input
                  type="file"
                  id="event-media-upload"
                  accept=".pdf,image/*"
                  multiple
                  disabled={imageUploading}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) {
                      void handleUpload(files);
                      e.target.value = "";
                    }
                  }}
                />
                <label
                  htmlFor="event-media-upload"
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "2rem" }}>
                    {imageUploading ? "⏳" : "📁"}
                  </span>
                  <span style={{ fontWeight: 600, color: "#1e3a8a" }}>
                    {imageUploading
                      ? "Uploading files..."
                      : "Click to upload multiple files"}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Supports Images and PDF documents
                  </span>
                </label>
              </div>

              {imageUrls.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "1.5rem",
                  }}
                >
                  {imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="glass-panel"
                      style={{
                        width: 140,
                        padding: "8px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.6)",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          height: 100,
                          borderRadius: "8px",
                          overflow: "hidden",
                          background: "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {url.toLowerCase().endsWith(".pdf") ? (
                          <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "1.5rem" }}>📄</span>
                            <small
                              style={{
                                display: "block",
                                fontSize: "0.6rem",
                                color: "#64748b",
                              }}
                            >
                              PDF
                            </small>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt="Event"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn secondary danger"
                        style={{
                          width: "100%",
                          padding: "4px",
                          fontSize: "0.7rem",
                          marginTop: "8px",
                          background: "rgba(239, 68, 68, 0.05)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.1)",
                        }}
                        onClick={() =>
                          setImageUrls((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="admin-form-actions"
              style={{
                marginTop: "2.5rem",
                padding: "20px",
                background: "rgba(30, 64, 175, 0.05)",
                borderRadius: "16px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                className="btn secondary"
                onClick={resetForm}
                disabled={saving || imageUploading}
                style={{
                  borderColor: "rgba(30, 64, 175, 0.2)",
                  color: "#1e3a8a",
                }}
              >
                Discard Changes
              </button>
              <button
                type="submit"
                className="btn"
                disabled={saving || imageUploading}
                style={{ padding: "12px 32px" }}
              >
                {saving ? "Saving Event..." : "Publish Event"}
              </button>
            </div>
          </form>
        </section>

        <section
          className="admin-panel glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="admin-panel-header">
            <h3>Published Events</h3>
            <p>
              Manage the display order and visibility of your published
              milestones.
            </p>
          </div>

          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div className="spinner"></div>
                <p style={{ marginTop: "1rem", color: "#64748b" }}>
                  Synchronizing events data...
                </p>
              </div>
            ) : sortedRows.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 1rem",
                  color: "#94a3b8",
                }}
              >
                <p>No events have been published for this program yet.</p>
              </div>
            ) : (
              <table className="admin-table premium-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Cover Media</th>
                    <th>Event Details</th>
                    <th style={{ width: 100 }}>Sort</th>
                    <th style={{ width: 140 }}>Audit Log</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => {
                    const photos = parseImageList(row.image);
                    const cover = photos[0] || "";
                    return (
                      <tr key={row.id}>
                        <td>
                          {cover ? (
                            <div
                              style={{
                                position: "relative",
                                width: 120,
                                height: 72,
                                borderRadius: "8px",
                                overflow: "hidden",
                                border: "1px solid rgba(0,0,0,0.05)",
                              }}
                            >
                              {cover.toLowerCase().endsWith(".pdf") ? (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#f5f5f5",
                                  }}
                                >
                                  <span style={{ fontSize: "1.2rem" }}>
                                    📄 PDF
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={cover}
                                  alt={toText(row.caption) || "event"}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              )}
                              {photos.length > 1 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: 4,
                                    right: 4,
                                    background: "rgba(0,0,0,0.6)",
                                    color: "white",
                                    fontSize: "0.6rem",
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                  }}
                                >
                                  +{photos.length - 1} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                width: 120,
                                height: 72,
                                background: "#f8fafc",
                                borderRadius: "8px",
                                border: "1px dashed #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#94a3b8",
                              }}
                            >
                              No Media
                            </div>
                          )}
                        </td>
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#1e3a8a",
                              marginBottom: "4px",
                            }}
                          >
                            {row.caption || "Untitled Event"}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                              opacity: 0.8,
                            }}
                          >
                            <span
                              style={{ fontSize: "0.8rem", color: "#64748b" }}
                            >
                              📍 {row.location || "Online / Not specified"}
                            </span>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "#3b82f6",
                                fontWeight: 500,
                              }}
                            >
                              📅 {row.date || "No date"}
                            </span>
                          </div>
                          <div style={{ marginTop: "8px" }}>
                            <span
                              className={`status-pill ${row.is_active !== false ? "published" : "draft"}`}
                              style={{
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background:
                                  row.is_active !== false
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : "rgba(100, 116, 139, 0.1)",
                                color:
                                  row.is_active !== false
                                    ? "#16a34a"
                                    : "#475569",
                              }}
                            >
                              {row.is_active !== false ? "Visible" : "Hidden"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="admin-input"
                            style={{
                              width: "80px",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                            value={String(row.sort_order ?? 0)}
                            onChange={(e) => {
                              const next = Number(e.target.value) || 0;
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === row.id
                                    ? { ...x, sort_order: next }
                                    : x,
                                ),
                              );
                            }}
                            onBlur={(e) =>
                              updateSortOrder(row, Number(e.target.value) || 0)
                            }
                            min={0}
                          />
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          <div>
                            Created: {fmtDate(row.created_at).split(",")[0]}
                          </div>
                          <div style={{ opacity: 0.7 }}>
                            {fmtDate(row.created_at).split(",")[1]}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.75rem",
                              marginRight: "8px",
                            }}
                            onClick={() => handleEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn secondary danger"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.75rem",
                              background: "rgba(239, 68, 68, 0.05)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.1)",
                            }}
                            onClick={() => handleDelete(row)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EventsManager;
