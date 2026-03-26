import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Paper, Tabs, Tab, List, ListItemButton, Typography, Button } from "@mui/material";
import { fetchCmsNavigation, fetchCmsPageBySlug, fetchCmsPageByPath, fetchWhatsNew, fetchCmsMedia } from "../../services/cms";
import { api } from "../../services/api";
import { useCmsTable } from "../../hooks/useCmsTable";

type HomeTabItem = {
  title: string;
  href: string;
  subtitle?: string | null;
  documentUrl?: string | null;
  imageUrl?: string | null;
  dateRange?: string | null;
  sortMs?: number;
  closingDateMs?: number;
  tenderNumber?: string | null;
  docLinks?: { label: string; href: string }[];
};

const WHATS_NEW: HomeTabItem[] = [
  {
    title: "Recruitment: Vacant posts in the Office of the Commissioner",
    href: "/notice-board",
    documentUrl: null,
    dateRange: null,
  },
  {
    title: "EOI: Partnerships for accessibility and awareness initiatives",
    href: "/resources/tenders",
  },
  {
    title: "Advisory: Compliance with accessibility norms in establishments",
    href: "/resources/notifications-resolutions-circulars-om",
  },
  {
    title: "Extension: Time to file Accessibility Audit Reports",
    href: "/resources/notifications-resolutions-circulars-om",
  },
];

const FALLBACK_TENDERS: HomeTabItem[] = [
  {
    title: "RFP: Accessibility assessment and audit services",
    href: "/resources/tenders",
    documentUrl: null,
    dateRange: null,
  },
  {
    title: "Empanelment: Web Accessibility Auditors (WA)",
    href: "/resources/tenders",
    documentUrl: null,
    dateRange: null,
  },
  {
    title: "Quotation: Assistive devices and training materials",
    href: "/resources/tenders",
    documentUrl: null,
    dateRange: null,
  },
];

const MAX_WHATS_NEW_ITEMS = 10;
const WHATS_NEW_LIST_MAX_HEIGHT = 360;

export default function TabComponents() {
  const EXTERNAL_NOTIFICATIONS_URL = "https://ssepd.odisha.gov.in/en/notifications/notification";
  const { t } = useTranslation();
  const [tab, setTab] = useState("new");
  const [whatsNew, setWhatsNew] = useState<HomeTabItem[]>(WHATS_NEW);
  const [photoWhatsNew, setPhotoWhatsNew] = useState<HomeTabItem[]>([]);
  const [navWhatsNew, setNavWhatsNew] = useState<HomeTabItem[]>([]);
  const [eop, setEop] = useState<{ title: string; href: string }>(
    () => ({ title: "Guidelines: Equal Opportunity Policy (EOP) template", href: "/acts/equal-opportunity-policy" })
  );
  const [tenderTableName, setTenderTableName] = useState<string | null>(null);
  const [notifTableName, setNotifTableName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadWhatsNew() {
      try {
        const items = await fetchWhatsNew(10);
        if (!cancelled && items?.length) {
          setWhatsNew(
            items.map((item, idx) => ({
              title: item.title || `Update ${idx + 1}`,
              href: item.link || "/notice-board",
              sortMs: parseDateMs(item.publishedAt || item.createdAt || null),
            }))
          );
        }
      } catch {
        // fallback data will be used
      }
    }
    loadWhatsNew();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPhotoUploads() {
      try {
        const items = await fetchCmsMedia("photo");
        if (!cancelled && items?.length) {
          const mapped = items.slice(0, 3).map((item, idx) => {
            const rawName =
              item.originalName?.trim() ||
              item.altText?.trim() ||
              item.albumName?.trim() ||
              item.filename ||
              `Photo ${idx + 1}`;
            const withoutExt = rawName.replace(/\.[a-z0-9]+$/i, "");
            const cleaned = withoutExt
              .replace(/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?-?/i, "")
              .replace(/^\d{10,}[_-]?/, "")
              .replace(/[_-]+/g, " ")
              .trim();
            const displayName = cleaned || `New upload ${idx + 1}`;

            return {
              title: `Photo Gallery: ${displayName}`,
              href: "/media/photo-gallery",
              dateRange: formatDate(item.createdAt),
              sortMs: parseDateMs(item.createdAt),
            };
          });
          setPhotoWhatsNew(mapped);
        }
      } catch {
        // ignore photo feed failures; other sources remain
      }
    }

    loadPhotoUploads();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const page = await fetchCmsPageBySlug("equal-opportunity-policy");
        if (!cancelled && page) {
          setEop({ title: page.title ?? "Equal Opportunity Policy", href: page.path ?? "/acts/equal-opportunity-policy" });
        }
      } catch {
        // ignore - fallback will be used
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTenderTableName() {
      try {
        const page = await fetchCmsPageByPath("/resources/tenders");
        if (!cancelled && page?.dynamicTableName) {
          setTenderTableName(page.dynamicTableName);
        }
      } catch {
        // fallback will be used
      }
    }
    loadTenderTableName();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifTableName() {
      try {
        // Prefer the notice board page if present
        let page = await fetchCmsPageByPath("/notice-board");
        if (!cancelled && page?.dynamicTableName) {
          setNotifTableName(page.dynamicTableName);
          return;
        }

        // Fallback to the notifications/ resolutions page
        page = await fetchCmsPageByPath("/resources/notifications-resolutions-circulars-om");
        if (!cancelled && page?.dynamicTableName) {
          setNotifTableName(page.dynamicTableName);
        }
      } catch {
        // fallback will be used
      }
    }
    loadNotifTableName();
    return () => {
      cancelled = true;
    };
  }, []);

  // Try the mapped table name from the CMS page; fall back to a common name 'tenders'
  const effectiveTenderTableName = tenderTableName ?? "tenders";
  const { table: tenderTable } = useCmsTable(effectiveTenderTableName ?? undefined, 6);
  const { table: notifTable } = useCmsTable(notifTableName ?? undefined, 6);

  // Date formatter: use en-GB so dates render as dd/mm/yyyy like the screenshot
  function formatDate(d: unknown) {
    if (!d) return null;
    try {
      const s = String(d).trim();

      // Try native parse first (ISO etc.)
      let dt = new Date(s);
      if (isNaN(dt.getTime())) {
        // Support common non-ISO formats like DD-MM-YYYY or DD/MM/YYYY
        const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s].*)?$/);
        if (m) {
          const day = Number(m[1]);
          const month = Number(m[2]) - 1;
          const year = Number(m[3]);
          dt = new Date(year, month, day);
        }
      }

      if (isNaN(dt.getTime())) return null;
      return dt.toLocaleDateString("en-GB");
    } catch {
      return null;
    }
  }

  function parseDateMs(value: unknown): number {
    if (!value) return 0;
    const s = String(value).trim();
    if (!s) return 0;

    let dt = new Date(s);
    if (isNaN(dt.getTime())) {
      const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s].*)?$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]) - 1;
        const year = Number(m[3]);
        dt = new Date(year, month, day);
      }
    }
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  function getFieldValue(row: Record<string, unknown>, ...keys: string[]) {
    const lowerMap = new Map<string, unknown>(
      Object.keys(row).map((k) => [k.toLowerCase(), row[k]])
    );
    for (const key of keys) {
      if (key in row) return row[key];
      const val = lowerMap.get(String(key).toLowerCase());
      if (val !== undefined) return val;
    }
    return undefined;
  }

  function isIdentifierLike(value: string) {
    const s = value.trim();
    if (!s) return false;
    // UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
      return true;
    }
    // Generic dashed/hex ids often seen in DB keys
    if (/^[0-9a-f-]{24,}$/i.test(s)) {
      return true;
    }
    // Mongo-style/ObjectId-like
    if (/^[0-9a-f]{24}$/i.test(s)) {
      return true;
    }
    return false;
  }

  function pickRowTitle(row: Record<string, unknown>) {
    const direct = getFieldValue(
      row,
      "title",
      "name",
      "heading",
      "subject",
      "displayName",
      "caption",
      "summary",
      "description",
      "originalName",
      "original_name",
      "filename",
      "file_name"
    );

    if (typeof direct === "string" && direct.trim()) {
      const cleaned = direct.trim().replace(/\.[a-z0-9]+$/i, "");
      if (!isIdentifierLike(cleaned)) {
        return cleaned;
      }
    }

    const candidate = Object.values(row).find((value) => {
      if (typeof value !== "string") return false;
      const s = value.trim();
      if (!s) return false;
      if (/^https?:\/\//i.test(s)) return false;
      if (isIdentifierLike(s)) return false;
      return true;
    });

    if (typeof candidate === "string" && candidate.trim()) {
      const cleaned = candidate.trim().replace(/\.[a-z0-9]+$/i, "");
      if (!isIdentifierLike(cleaned)) {
        return cleaned;
      }
    }

    return null;
  }

  function pickRowSummary(row: Record<string, unknown>, title?: string | null) {
    const direct = getFieldValue(
      row,
      "summary",
      "description",
      "body",
      "details",
      "content",
      "text",
      "note",
      "remarks",
      "message"
    );

    const normalize = (value: unknown) =>
      typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

    const directText = normalize(direct);
    if (
      directText &&
      !isIdentifierLike(directText) &&
      (!title || directText.toLowerCase() !== String(title).toLowerCase())
    ) {
      return directText;
    }

    const candidates = Object.values(row)
      .filter((value): value is string => typeof value === "string")
      .map((value) => normalize(value))
      .filter((value) => value.length >= 24)
      .filter((value) => !/^https?:\/\//i.test(value))
      .filter((value) => !isIdentifierLike(value))
      .filter((value) => !title || value.toLowerCase() !== String(title).toLowerCase())
      .sort((a, b) => b.length - a.length);

    return candidates[0] || null;
  }

  function isPlaceholderContent(value: string) {
    const lower = value.toLowerCase();
    return (
      lower.includes("placeholder content") ||
      lower.includes("content for this section will be managed") ||
      lower.includes("replace this text using the admin dashboard")
    );
  }

  function normalizeHeadline(value: string, maxLength = 180) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength - 1).trim()}…`;
  }

  function pickRowDate(row: Record<string, unknown>) {
    return (
      getFieldValue(
        row,
        "created_at",
        "createdAt",
        "updated_at",
        "updatedAt",
        "published_at",
        "publishedAt",
        "start_date",
        "startDate",
        "date",
        "event_date",
        "eventDate"
      ) || null
    );
  }

  useEffect(() => {
    let cancelled = false;

    type NavNode = { path: string; label: string };
    type NavUpdate = HomeTabItem;

    function normalizePath(rawPath: string | null | undefined) {
      const val = String(rawPath || "").trim();
      if (!val) return null;
      return val.startsWith("/") ? val : `/${val}`;
    }

    function flattenNavigation(items: any[]): NavNode[] {
      const output: NavNode[] = [];
      const walk = (nodes: any[]) => {
        for (const node of nodes || []) {
          const normalizedPath = normalizePath(node?.path);
          if (normalizedPath) {
            output.push({
              path: normalizedPath,
              label: String(node?.label || "").trim(),
            });
          }
          if (Array.isArray(node?.children) && node.children.length) {
            walk(node.children);
          }
        }
      };
      walk(items);
      return output;
    }

    async function loadNavUpdates() {
      try {
        const navTree = await fetchCmsNavigation();
        const flattened = flattenNavigation(navTree || []);
        const labelByPath = new Map<string, string>();
        for (const item of flattened) {
          if (!labelByPath.has(item.path)) {
            labelByPath.set(item.path, item.label);
          }
        }

        const excluded = new Set<string>(["/", "/notice-board", "/media/photo-gallery"]);
        const paths = Array.from(new Set(flattened.map((item) => item.path))).filter(
          (path) => !excluded.has(path) && !path.startsWith("/admin")
        );

        const pageItems = await Promise.all(
          paths.map(async (path) => {
            try {
              const page = await fetchCmsPageByPath(path);
              if (!page) return null;
              return { path, page, navLabel: labelByPath.get(path) || null };
            } catch {
              return null;
            }
          })
        );

        const updates = await Promise.all(
          pageItems
            .filter((entry): entry is { path: string; page: any; navLabel: string | null } => Boolean(entry?.page))
            .map(async (entry) => {
              const page = entry.page;
              const sectionTitle =
                String(page.title || "").trim() ||
                String(entry.navLabel || "").trim() ||
                entry.path;

              let itemTitle: string | null = null;
              let itemSubtitle: string | null = null;
              let itemDate: unknown = page.updatedAt || page.publishedAt || null;

              // Only attempt to fetch dynamic table rows if the table name looks like a safe SQL identifier.
              // This avoids sending requests that will be rejected by the backend with 400 for invalid names
              // (for example when the CMS stored a path or other non-identifier value in the field).
              const dynName = page.dynamicTableName;
              const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
              if (typeof dynName === "string" && IDENT_RE.test(dynName)) {
                try {
                  const response = await api.get<{ data?: { rows?: Record<string, unknown>[] } }>(
                    `/cms/tables/${dynName}`,
                    { params: { limit: 1 } }
                  );
                  const latestRow = response.data?.data?.rows?.[0];
                  if (latestRow) {
                    const rowTitle = pickRowTitle(latestRow);
                    const rowSummary = pickRowSummary(latestRow, rowTitle);
                    const rowDate = pickRowDate(latestRow);
                    if (rowTitle) {
                      itemTitle = rowTitle;
                    }
                    if (rowSummary) {
                      if (!itemTitle) itemTitle = rowSummary;
                      else if (rowSummary.toLowerCase() !== itemTitle.toLowerCase()) itemSubtitle = rowSummary;
                    }
                    if (rowDate) {
                      itemDate = rowDate;
                    }
                  }
                } catch {
                  // fallback to page-level metadata
                }
              }

              if (!itemTitle) {
                const pageSummary = String(page.summary || "").replace(/\s+/g, " ").trim();
                if (pageSummary && !isPlaceholderContent(pageSummary)) {
                  itemTitle = pageSummary;
                  itemSubtitle = sectionTitle;
                }
              }

              const finalTitle = itemTitle ? normalizeHeadline(itemTitle) : "";
              if (!finalTitle.trim()) return null;
              if (finalTitle.toLowerCase() === sectionTitle.toLowerCase()) return null;
              if (finalTitle.toLowerCase() === String(entry.navLabel || "").trim().toLowerCase()) return null;

              const href = normalizePath(page.path) || entry.path;
              return {
                title: finalTitle,
                href,
                subtitle: itemSubtitle ? normalizeHeadline(itemSubtitle, 220) : null,
                dateRange: formatDate(itemDate),
                sortMs: parseDateMs(itemDate),
              } as NavUpdate;
            })
        );

        const sorted = updates
          .filter((item): item is NavUpdate => Boolean(item?.title && item?.href))
          .sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0))
          .slice(0, 20);

        if (!cancelled) {
          setNavWhatsNew(sorted);
        }
      } catch {
        if (!cancelled) {
          setNavWhatsNew([]);
        }
      }
    }

    loadNavUpdates();
    return () => {
      cancelled = true;
    };
  }, []);

  const NOTIFS = [
    { title: eop.title, href: eop.href },
    { title: "Notification: RPwD implementation updates", href: "/acts/disability-acts" },
    { title: "Resolution: State Advisory Board meetings", href: "/resources/state-advisory-board" },
  ];

  const notifications = (() => {
    if (!notifTable?.rows?.length) return NOTIFS;
    return notifTable.rows.slice(0, 6).map((row, idx) => {
      const anyRow = row as Record<string, unknown>;

      // case-insensitive lookup helper
      const lowerMap = new Map<string, unknown>(Object.keys(anyRow).map((k) => [k.toLowerCase(), anyRow[k]]));
      function getFieldLocal(...keys: string[]) {
        for (const k of keys) {
          if (k in anyRow) return anyRow[k];
          const lower = String(k).toLowerCase();
          if (lowerMap.has(lower)) return lowerMap.get(lower);
        }
        return undefined;
      }

      const title = (getFieldLocal("title", "name", "heading", "subject", "displayName") as string) || Object.values(anyRow).find((v) => typeof v === "string") || `Notification ${idx + 1}`;
      const href = (getFieldLocal("link", "url") as string) || "/notice-board";
      const subtitle = (getFieldLocal("summary", "description", "body") as string) || null;
      const startField = (getFieldLocal("start_date", "startDate", "start_at", "startAt", "from", "from_date") as string) || null;
      const endField = (getFieldLocal("end_date", "endDate", "end_at", "endAt", "to", "to_date") as string) || null;
      const published = null; // deprecated - removed from frontend display
      const start = formatDate(startField) || formatDate(getFieldLocal("strart_date"));
      const end = formatDate(endField);
      const dateRange = start && end ? `${start} - ${end}` : start || end || null;
      const sortMs = Math.max(
        parseDateMs(getFieldLocal("updated_at", "updatedAt")),
        parseDateMs(getFieldLocal("created_at", "createdAt")),
        parseDateMs(getFieldLocal("published_at", "publishedAt")),
        parseDateMs(endField),
        parseDateMs(startField),
        0
      );

      // Reuse the same robust extractor used for tenders
      function extractUrl(value: unknown): string | null {
        if (!value) return null;
        if (typeof value === "string") {
          const s = value.trim();
          if (!s) return null;
          if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
            try {
              const parsed = JSON.parse(s);
              return extractUrl(parsed);
            } catch {
              // fall through
            }
          }
          return s;
        }
        if (Array.isArray(value) && value.length) return extractUrl(value[0]);
        if (typeof value === "object") {
          const obj = value as Record<string, any>;
          if (typeof obj.url === "string") return obj.url;
          if (typeof obj.path === "string") return obj.path;
          if (typeof obj.file === "string") return obj.file;
          if (typeof obj.filename === "string") return obj.filename;
        }
        return null;
      }

      const possibleDocFields = [
        "documents",
        "attachments",
        "files",
        "docs",
        "document",
        "document_url",
        "documentUrl",
        "doc",
        "file",
        "file_url",
        "fileUrl",
        "attachment",
        "attachment_url",
        "attachmentUrl",
        "pdf",
        "pdf_url",
        "pdfUrl",
        "url",
        "link",
        "path",
        "filepath",
        "filePath",
        "filename",
      ];

      let documentUrl: string | null = null;
      for (const key of possibleDocFields) {
        const val = getFieldLocal(key);
        if (val != null) {
          const u = extractUrl(val);
          if (u) {
            documentUrl = u;
            break;
          }
        }
      }

      if (documentUrl) {
        const looksLikeFilename = /^[^\\/]+\\.(pdf|docx?|txt|xlsx?)$/i.test(documentUrl);
        if (!documentUrl.startsWith("/") && !documentUrl.startsWith("http") && looksLikeFilename) {
          documentUrl = `/uploads/media/${documentUrl}`;
        }
        if (!documentUrl.startsWith("/") && documentUrl.startsWith("uploads/")) {
          documentUrl = `/${documentUrl}`;
        }
      }

      // Try extracting an image as well (optional)
      const possibleImageFields = [
        "image",
        "image_url",
        "imageUrl",
        "heroImagePath",
        "thumbnail",
        "photo",
        "imagePath",
        "imagepath",
        "cover",
        "coverImage",
        "img",
        "image_name",
        "file_path",
      ];
      let imageUrl: string | null = null;
      for (const key of possibleImageFields) {
        const val = getFieldLocal(key);
        if (val != null) {
          const u = extractUrl(val);
          if (u) {
            imageUrl = u;
            break;
          }
        }
      }
      if (imageUrl && !imageUrl.startsWith("/") && imageUrl.startsWith("uploads/")) imageUrl = `/${imageUrl}`;

      return { title: String(title), href, subtitle, published: null, documentUrl, imageUrl, dateRange, sortMs };
    });
  })();

  const tenderItems = (() => {
    if (!tenderTable?.rows?.length) return FALLBACK_TENDERS;
    return tenderTable.rows.slice(0, 6).map((row, idx) => {
      const anyRow = row as Record<string, unknown>;
      // DEBUG: Log all fields for this row to help identify date fields
      if (idx === 0) {
        // Only log for the first row to avoid spamming
      }

      // Helper: case-insensitive field lookup for common keys
      const lowerMap = new Map<string, unknown>(Object.keys(anyRow).map((k) => [k.toLowerCase(), anyRow[k]]));
      function getField(...keys: string[]) {
        for (const k of keys) {
          if (k in anyRow) return anyRow[k];
          const lower = String(k).toLowerCase();
          if (lowerMap.has(lower)) return lowerMap.get(lower);
        }
        return undefined;
      }

      // Prefer explicit human-friendly title fields. Avoid falling back to raw file IDs/UUIDs.
      const explicitTitle = (getField("title", "name", "heading", "subject", "displayName", "originalName", "original_name", "filename", "file_name", "fileName") as string) || null;

      const href = (getField("link", "url") as string) || "/resources/tenders";
      const subtitle = (getField("summary", "description", "summary_en", "summaryor", "body") as string) || null;
      const startField = (getField(
        "start_date",
        "startDate",
        "startdate",
        "strart_date",
        "strartDate",
        "start_at",
        "startAt",
        "opening_date",
        "openingDate",
        "open_date",
        "openDate",
        "from",
        "from_date"
      ) as string) || null;
      const endField = (getField(
        "end_date",
        "endDate",
        "enddate",
        "close_date",
        "closeDate",
        "end_at",
        "endAt",
        "to",
        "to_date",
        "toDate",
        "closing_date",
        "closingDate",
        "closingdate",
        "deadline",
        "deadline_date",
        "deadlineDate",
        "due_date",
        "dueDate",
        "last_date",
        "lastDate",
        "lastdate",
        "expiry",
        "expiry_date",
        "valid_till",
        "validTill",
        "valid_to",
        "validTo"
      ) as string) || null;
      const published = null; // deprecated - removed from frontend display
      let start = formatDate(startField);
      let end = formatDate(endField);

      // Fallback: infer date fields by column names when table uses custom keys.
      if (!start || !end) {
        const rowEntries = Array.from(lowerMap.entries());
        const inferDateByKey = (patterns: RegExp[]) => {
          for (const [key, value] of rowEntries) {
            if (value == null) continue;
            if (!patterns.some((pattern) => pattern.test(key))) continue;
            const parsed = formatDate(value);
            if (parsed) return parsed;
          }
          return null;
        };

        if (!start) {
          start = inferDateByKey([
            /(^|_)(start|strart|from|open|opening|begin)(_|$)/i,
            /(startdate|fromdate|openingdate)/i,
          ]);
        }
        if (!end) {
          end = inferDateByKey([
            /(^|_)(end|to|close|closing|deadline|due|last|expiry|valid|till)(_|$)/i,
            /(enddate|todate|closingdate|deadline_date|duedate|lastdate|validtill|validto)/i,
          ]);
        }
      }
      let dateRange = null;
      if (start && end) dateRange = `${start} - ${end}`;
      else if (start) dateRange = start;
      else if (end) dateRange = end;
      else dateRange = null;

      const closingDateMs =
        parseDateMs(endField) || parseDateMs(startField) || undefined;
      const tenderNumberRaw = getField(
        "tender_no",
        "tender_number",
        "tenderno",
        "tenderNo",
        "tender_id",
        "notice_no",
        "notice_number",
        "noticeId",
      );
      const tenderNumber =
        tenderNumberRaw != null ? String(tenderNumberRaw).trim() || null : null;

      // Extract document URL from common field names / structures
      const possibleDocFields = [
        "documents",
        "attachments",
        "files",
        "docs",
        "document",
        "document_url",
        "documentUrl",
        "doc",
        "file",
        "file_url",
        "fileUrl",
        "attachment",
        "attachment_url",
        "attachmentUrl",
        "pdf",
        "pdf_url",
        "pdfUrl",
        "url",
        "link",
        "path",
        "filepath",
        "filePath",
        "filename",
      ];

      function extractUrl(value: unknown): string | null {
        if (!value) return null;
        if (typeof value === "string") {
          const s = value.trim();
          if (!s) return null;
          if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
            try {
              const parsed = JSON.parse(s);
              return extractUrl(parsed);
            } catch {
              // fall through and return raw string
            }
          }
          return s;
        }
        if (Array.isArray(value) && value.length) {
          return extractUrl(value[0]);
        }
        if (typeof value === "object") {
          const obj = value as Record<string, any>;
          if (typeof obj.url === "string") return obj.url;
          if (typeof obj.path === "string") return obj.path;
          if (typeof obj.file === "string") return obj.file;
          if (typeof obj.filename === "string") return obj.filename;
        }
        return null;
      }

      function normalizePublicUrl(url: string): string {
        let candidate = url.trim();
        const absoluteMatch = /^https?:\/\//i.test(candidate);
        const looksLikeFilename = /^[^\\/]+\.(pdf|docx?|txt|xlsx?)$/i.test(candidate);
        if (!absoluteMatch && looksLikeFilename && !candidate.startsWith("/")) {
          candidate = `/uploads/media/${candidate}`;
        }
        if (!absoluteMatch && candidate.startsWith("uploads/")) {
          candidate = `/${candidate}`;
        }
        return candidate;
      }

      const toPublicUrl = (raw: string | null | undefined): string | null => {
        if (!raw) return null;
        const trimmed = String(raw).trim();
        if (!trimmed) return null;
        return normalizePublicUrl(trimmed);
      };

      let documentUrl: string | null = null;
      for (const key of possibleDocFields) {
        const val = getField(key);
        if (val != null) {
          const u = extractUrl(val);
          const normalized = toPublicUrl(u);
          if (normalized) {
            documentUrl = normalized;
            break;
          }
        }
      }

      const sortMs = Math.max(
        parseDateMs(getField("updated_at", "updatedAt")),
        parseDateMs(getField("created_at", "createdAt")),
        parseDateMs(getField("published_at", "publishedAt")),
        parseDateMs(endField),
        parseDateMs(startField),
        0,
      );

      const docLinks: { label: string; href: string }[] = [];
      if (documentUrl) {
        docLinks.push({ label: "Tender Document", href: documentUrl });
      }
      const addDocLink = (label: string, ...keys: string[]) => {
        const val = getField(...keys);
        if (val == null) return;
        const u = extractUrl(val);
        const normalized = toPublicUrl(u);
        if (!normalized) return;
        if (docLinks.some((entry) => entry.href === normalized)) return;
        docLinks.push({ label, href: normalized });
      };
      addDocLink("Corrigendum Document", "corrigendum_document", "corrigendumDoc", "corrigendum_url", "corrigendumUrl", "corrigendum_document_url");
      addDocLink("Query Submission", "query_submission", "querySubmission", "query_submission_url", "querySubmissionUrl", "query");
      addDocLink("Advertisement", "advertisement", "advertisement_url", "advertisementUrl");

      // Try to extract an image URL from common fields
      const possibleImageFields = [
        "image",
        "image_url",
        "imageUrl",
        "heroImagePath",
        "thumbnail",
        "photo",
        "imagePath",
        "imagepath",
        "cover",
        "coverImage",
        "img",
        "image_name",
        "file_path",
      ];

      let imageUrl: string | null = null;
      for (const key of possibleImageFields) {
        const val = getField(key);
        if (val != null) {
          const u = extractUrl(val);
          if (u) {
            imageUrl = u;
            break;
          }
        }
      }

      // Normalize document/image public paths
      if (imageUrl) {
        if (!imageUrl.startsWith("/") && imageUrl.startsWith("uploads/")) imageUrl = `/${imageUrl}`;
      }

      // If explicit title is missing, try to derive a friendly title.
      let title = explicitTitle as string | null;

      // If we still don't have a title, try deriving from document metadata / values.
      if (!title) {
        // If there is a readable filename in the documentUrl, use its basename
        if (documentUrl) {
          try {
            const parts = documentUrl.split("/");
            const last = parts[parts.length - 1] || documentUrl;
            // decode URI components if any
            title = decodeURIComponent(last.replace(/^[0-9\-_,]+_?/, "") );
          } catch {
            title = documentUrl;
          }
        }
      }

      // Final fallback: any string-like field that isn't a raw UUID/ID-looking value
      if (!title) {
        const anyString = Object.values(anyRow).find((v) => typeof v === "string") as string | undefined;
        if (anyString) {
          // ignore pure UUID-like values
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(anyString.trim());
          const looksLikeFilename = /^[^\\/]+\.(pdf|docx?|txt|xlsx?)$/i.test(anyString.trim());
          if (!isUuid && !looksLikeFilename) title = anyString;
        }
      }

      if (!title) title = `Tender ${idx + 1}`;

      return {
        title: String(title),
        href,
        documentUrl,
        imageUrl,
        subtitle,
        published: null,
        dateRange,
        sortMs,
        closingDateMs,
        tenderNumber,
        docLinks,
      };
    });
  })();

  const noticeBoardWhatsNew: HomeTabItem[] = notifTable?.rows?.length
    ? notifications.slice(0, 3).map((item) => ({
      title: item.title.startsWith("Notice Board: ") ? item.title : `Notice Board: ${item.title}`,
      href: "/notice-board",
      dateRange: (item as any).dateRange ?? null,
      subtitle: (item as any).subtitle ?? null,
      documentUrl: (item as any).documentUrl ?? null,
      imageUrl: (item as any).imageUrl ?? null,
      sortMs: (item as any).sortMs ?? 0,
    }))
    : [];

  const mergedWhatsNew: HomeTabItem[] = (() => {
    const combined = [...photoWhatsNew, ...noticeBoardWhatsNew, ...navWhatsNew, ...whatsNew];
    const sortedCombined = [...combined].sort((a, b) => {
      const aMs = typeof a.sortMs === "number" ? a.sortMs : 0;
      const bMs = typeof b.sortMs === "number" ? b.sortMs : 0;
      return bMs - aMs;
    });
    const seen = new Set<string>();
    const unique: HomeTabItem[] = [];

    for (const item of sortedCombined) {
      const title = String(item.title || "").trim();
      const href = String(item.href || "/notice-board").trim() || "/notice-board";
      if (!title) continue;

      const dedupeKey = `${title.toLowerCase()}|${href.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      unique.push({ ...item, href });
      if (unique.length >= MAX_WHATS_NEW_ITEMS) break;
    }

    return unique.length ? unique : WHATS_NEW;
  })();

  const current = tab === "new" ? mergedWhatsNew : tab === "tenders" ? tenderItems : notifications;
  const tabContentMaxHeight = tab === "tenders" || tab === "new" ? 420 : WHATS_NEW_LIST_MAX_HEIGHT;

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <Paper
        elevation={4}
        sx={{
          borderRadius: "16px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "#0B1F4D",
        }}
      >
        <Tabs
          value={tab}
          onChange={(e, val) => {
            if (val === "notifs") {
              window.open(EXTERNAL_NOTIFICATIONS_URL, "_blank", "noopener");
              return;
            }
            setTab(val);
          }}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            background: "#e8eefc",
            px: 1.5,
            pt: 1,
            pb: 0,
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTab-root": {
              fontSize: "17px",
              fontWeight: 600,
              textTransform: "none",
              px: 3,
              py: 1.2,
              borderRadius: "10px 10px 0 0",
              color: "#0b2a63",
              minHeight: 0,
              mr: 1,
              "&.Mui-selected": {
                background: "#f1f4ff",
                color: "#0a3378",
                boxShadow: "none",
                borderBottom: "3px solid #0a3378",
              },
            },
          }}
        >
          <Tab value="new" label={t("homepage.whatsNew")} />
          <Tab value="tenders" label={t("homepage.tenders")} />
          <Tab value="notifs" label={t("homepage.notifications")} />
        </Tabs>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            background: "#f1f4ff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              maxHeight: tabContentMaxHeight,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            <List
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.6,
                pr: 1,
              }}
            >
            {current.map((item, idx) => {
              if (tab === "tenders" || tab === "new" || tab === "notifs") {
                const isWhatsNew = tab === "new";
                const isTenders = tab === "tenders";
                const isNotifications = tab === "notifs";
                const itemHref = isNotifications
                  ? EXTERNAL_NOTIFICATIONS_URL
                  : String((item as any).href || "/resources/tenders");
                const isExternalHref = /^https?:\/\//i.test(itemHref);
                const linkProps = isExternalHref
                  ? ({ component: "a", href: itemHref, target: "_blank", rel: "noreferrer" } as const)
                  : ({ component: Link, to: itemHref } as const);

                if (isTenders) {
                  const docLinks = Array.isArray((item as any).docLinks)
                    ? (item as any).docLinks
                    : [];
                  const closingMs =
                    typeof (item as any).closingDateMs === "number"
                      ? (item as any).closingDateMs
                      : 0;
                  const closingDate =
                    closingMs && closingMs > 0 ? new Date(closingMs) : null;
                  const closingDay = closingDate
                    ? String(closingDate.getDate()).padStart(2, "0")
                    : "--";
                  const closingMonth = closingDate
                    ? closingDate
                        .toLocaleString("en-US", { month: "short" })
                        .toUpperCase()
                    : "TBD";
                  const closingYear = closingDate ? closingDate.getFullYear() : "";
                  const tenderNumber =
                    ((item as any).tenderNumber as string | null)?.trim() ||
                    `Tender ${idx + 1}`;
                  const description =
                    ((item as any).subtitle as string | null)?.trim() || "";
                  return (
                    <Box key={`${item.title}-${itemHref}-${idx}`} sx={{ width: "100%" }}>
                      <ListItemButton
                        {...(linkProps as any)}
                        sx={{
                          width: "100%",
                          p: 0,
                          borderRadius: "12px",
                          background: "#eef4ff",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "stretch",
                          boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            background: "#00467f",
                            color: "#fff",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 600,
                              letterSpacing: 0.5,
                            }}
                          >
                            Tender No:{" "}
                            <Box
                              component="span"
                              sx={{ color: "#8bc63f", fontWeight: 700 }}
                            >
                              {tenderNumber}
                            </Box>
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1.5,
                            alignItems: "flex-start",
                            px: 1.5,
                            py: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              minWidth: 65,
                              width: "auto",
                              background: "#005a9e",
                              borderRadius: "12px",
                              color: "#fff",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              px: 0.9,
                              py: 0.6,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: "11px", fontWeight: 700 }}
                            >
                              Closing Date
                            </Typography>
                            <Box
                              sx={{
                                mt: 0.6,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.8,
                                width: "100%",
                                justifyContent: "center",
                              }}
                            >
                              {closingYear ? (
                                <Typography
                                  sx={{
                                    fontSize: "11px",
                                    letterSpacing: "0.2em",
                                  }}
                                >
                                  {closingYear}
                                </Typography>
                              ) : null}
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "12px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.2em",
                                  }}
                                >
                                  {closingMonth}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "26px",
                                    fontWeight: 800,
                                    lineHeight: 1,
                                  }}
                                >
                                  {closingDay}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              flex: "1 1 0%",
                              minWidth: 200,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.4,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "18px",
                                color: "#063970",
                                lineHeight: 1.3,
                              }}
                            >
                              {item.title}
                            </Typography>
                            {description ? (
                              <Typography
                                sx={{
                                  color: "#1d2c57",
                                  fontSize: "14px",
                                  lineHeight: 1.4,
                                }}
                              >
                                {description}
                              </Typography>
                            ) : null}
                            {(item as any).dateRange ? (
                              <Typography
                                sx={{
                                  color: "#64748b",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                }}
                              >
                                {(item as any).dateRange}
                              </Typography>
                            ) : null}
                          </Box>
                          {docLinks.length ? (
                            <Box
                              sx={{
                                minWidth: 160,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.3,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "13px",
                                  fontWeight: 700,
                                  color: "#0b3a8c",
                                }}
                              >
                                Documents
                              </Typography>
                              {docLinks.map((link) => {
                                const isCorrigendum = /corrigendum/i.test(link.label);
                                const icon = /query/i.test(link.label) ? "🔔" : "📄";
                                return (
                                  <Typography
                                    key={link.label}
                                    component="a"
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.4,
                                      fontSize: "14px",
                                      fontWeight: 600,
                                      color: "#0a3378",
                                      textDecoration: "none",
                                    }}
                                  >
                                    <Box
                                      component="span"
                                      sx={{ fontSize: "18px", lineHeight: 1 }}
                                    >
                                      {icon}
                                    </Box>
                                    {link.label}
                                    {isCorrigendum ? (
                                      <Box
                                        component="span"
                                        sx={{
                                          ml: 0.8,
                                          px: 0.6,
                                          py: 0.1,
                                          background: "#d82a1e",
                                          color: "#fff",
                                          borderRadius: "999px",
                                          fontSize: "10px",
                                          fontWeight: 700,
                                        }}
                                      >
                                        New
                                      </Box>
                                    ) : null}
                                  </Typography>
                                );
                              })}
                            </Box>
                          ) : null}
                        </Box>
                      </ListItemButton>
                    </Box>
                  );
                }

                const rawSubtitle = (item as any).subtitle;
                const subtitleText =
                  typeof rawSubtitle === "string" ? rawSubtitle.trim() : "";
                const documentUrlValue =
                  typeof (item as any).documentUrl === "string"
                    ? (item as any).documentUrl.trim()
                    : "";
                const hasUploadsMediaPath = /(^|[\\/])uploads[\\/]+media[\\/]/i.test(subtitleText);
                const hasAbsoluteUploadsMediaUrl = /^https?:\/\/[^/]+\/uploads\/media\//i.test(subtitleText);
                const looksLikeSimpleMediaFile =
                  /^[^\\/\\s]+\\.(pdf|docx?|txt|xlsx?)$/i.test(subtitleText) &&
                  !(subtitleText.includes(" ") || subtitleText.length > 100);
                const looksLikeMediaSubtitle =
                  hasUploadsMediaPath || hasAbsoluteUploadsMediaUrl || looksLikeSimpleMediaFile;
                const showSubtitle =
                  Boolean(subtitleText) &&
                  subtitleText !== documentUrlValue &&
                  !looksLikeMediaSubtitle;

                const badgeDate = (() => {
                  const ms = typeof (item as any).sortMs === "number" && (item as any).sortMs > 0 ? (item as any).sortMs : 0;
                  if (ms) {
                    const d = new Date(ms);
                    if (!isNaN(d.getTime())) {
                      return {
                        day: String(d.getDate()).padStart(2, "0"),
                        month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
                        year: String(d.getFullYear()),
                      };
                    }
                  }
                  const dr = (item as any).dateRange as string | undefined;
                  if (dr) {
                    const m = dr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
                    if (m) {
                      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                      if (!isNaN(d.getTime())) {
                        return {
                          day: String(d.getDate()).padStart(2, "0"),
                          month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
                          year: String(d.getFullYear()),
                        };
                      }
                    }
                  }
                  return null;
                })();

                if (isWhatsNew) {
                  return (
                    <Box
                      key={`${item.title}-${itemHref}-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        borderRadius: "12px",
                        background: "#f8fbff",
                        px: 1,
                        py: 0.5,
                        boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                        border: "1px solid #e3e9f5",
                      }}
                    >
                      <ListItemButton
                        {...(linkProps as any)}
                        sx={{
                          p: 1.4,
                          borderRadius: "10px",
                          flex: "1 1 0%",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.2,
                          minHeight: 72,
                          minWidth: 0,
                          "&:hover": { background: "#eef5ff" },
                        }}
                      >
                        {badgeDate ? (
                          <Box
                            sx={{
                              width: 76,
                              minWidth: 76,
                              background: "#0B1F4D",
                              borderRadius: "8px",
                              color: "#fff",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              py: 1,
                              boxShadow: "0 4px 10px rgba(47,158,15,0.18)",
                            }}
                          >
                            <Typography sx={{ fontSize: "22px", fontWeight: 800, lineHeight: 1 }}>
                              {badgeDate.day}
                            </Typography>
                            <Typography sx={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", lineHeight: 1.2 }}>
                              {badgeDate.month}
                            </Typography>
                            <Typography sx={{ fontSize: "11px", fontWeight: 600, opacity: 0.9, lineHeight: 1.1 }}>
                              {badgeDate.year}
                            </Typography>
                          </Box>
                        ) : null}

                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.4,
                            justifyContent: "center",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "15px",
                              color: "#063970",
                              lineHeight: 1.35,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {item.title}
                          </Typography>
                          {showSubtitle ? (
                            <Typography
                              sx={{
                                color: "#4a5568",
                                fontSize: "13px",
                                lineHeight: 1.35,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {subtitleText}
                            </Typography>
                          ) : null}
                        </Box>
                      </ListItemButton>
                    </Box>
                  );
                }

                return (
                  <Box
                    key={`${item.title}-${itemHref}-${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: isTenders ? "flex-start" : "center",
                      gap: 1,
                      borderRadius: "12px",
                      background: "#eef4ff",
                      px: 1,
                      py: 0.5,
                      boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                    }}
                  >
                    <ListItemButton
                      {...(linkProps as any)}
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        flex: "1 1 0%",
                        mr: isWhatsNew ? 0 : 1,
                        display: "flex",
                        alignItems: isTenders ? "flex-start" : "center",
                        gap: isTenders ? 1.2 : 1,
                        minHeight: isTenders ? 80 : 64,
                        minWidth: 0,
                      }}
                    >

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          justifyContent: "center",
                          height: "100%",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "#063970",
                            overflow: isWhatsNew || isTenders ? "visible" : "hidden",
                            textOverflow: isWhatsNew || isTenders ? "clip" : "ellipsis",
                            whiteSpace: isWhatsNew || isTenders ? "normal" : "nowrap",
                            wordBreak: isTenders ? "break-word" : "normal",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.title}
                        </Typography>
                        {showSubtitle ? (
                          <Typography
                            sx={{ color: "#556", fontSize: "14px", maxWidth: 520 }}
                          >
                            {subtitleText.slice(0, 160)}
                          </Typography>
                        ) : null}
                      </Box>
                    </ListItemButton>

                    {!isWhatsNew ? (
                      <Box
                        sx={{
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 64,
                          flex: "0 0 220px",
                          minWidth: 220,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "#063970",
                            fontSize: "14px",
                            fontWeight: 700,
                            textAlign: "center",
                            lineHeight: 1,
                          }}
                        >
                          {(item as any).dateRange ?? ""}
                        </Typography>
                      </Box>
                    ) : null}

                    {!isWhatsNew ? (
                      <Box
                        sx={{
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "0 0 120px",
                          minWidth: 120,
                        }}
                      >
                        {(item as any).documentUrl ? (
                          <Button
                            href={(item as any).documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            variant="outlined"
                            size="small"
                            sx={{
                              color: "#0a3378",
                              borderColor: "#cfe1ff",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              fontSize: "12px",
                              px: 1.2,
                              py: 0.6,
                              height: 36,
                              borderRadius: "8px",
                            }}
                          >
                            [PDF] VIEW
                          </Button>
                        ) : (
                          <Box sx={{ width: 80, height: 36 }} />
                        )}
                      </Box>
                    ) : null}
                  </Box>
                );
              }

              return (
                <ListItemButton
                  key={`${item.title}-${idx}`}
                  component={Link}
                  to={item.href}
                  sx={{
                    borderRadius: "12px",
                    background: "#eef4ff",
                    "&:hover": { background: "#dfeaff" },
                    p: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 500, fontSize: "17px" }}>
                    {item.title}
                  </Typography>
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Box>
      </Paper>
    </Box>
  );
}
