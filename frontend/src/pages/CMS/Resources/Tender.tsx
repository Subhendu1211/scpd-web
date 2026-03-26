import React, { useMemo } from "react";
import { Box, Chip, Typography, Link as MuiLink } from "@mui/material";
import { MdNotificationsActive } from "react-icons/md";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import CmsContent from "../../../components/common/CmsContent";
import ResourceLayout from "@pages/Resources/ResourceLayout";

type TenderRow = Record<string, unknown>;

type TenderDocLink = {
  label: string;
  href: string;
  isCorrigendum?: boolean;
  isQuery?: boolean;
};

type TenderItem = {
  id: string;
  title: string;
  description: string | null;
  dateRange: string | null;
  closingDay: string;
  closingMonth: string;
  closingYear: string;
  tenderNumber: string | null;
  docLinks: TenderDocLink[];
  href: string;
};

const titleFields = ["title", "name", "heading", "subject", "displayName", "short_title", "tender_title"];
const descriptionFields = ["summary", "description", "subtitle", "details", "body"];
const startDateFields = [
  "start_date",
  "startDate",
  "startdate",
  "opening_date",
  "openingDate",
  "openingdate",
  "open_date",
  "openDate",
  "from",
  "from_date",
];
const endDateFields = [
  "end_date",
  "endDate",
  "enddate",
  "close_date",
  "closeDate",
  "closing_date",
  "closingDate",
  "closingdate",
  "deadline",
  "due_date",
  "expire_date",
  "expiry_date",
];
const dateRangeFields = [
  "date_range",
  "dateRange",
  "daterange",
  "period",
  "duration",
  "validity",
  "validity_period",
  "validityPeriod",
  "tender_period",
  "tenderPeriod",
];
const closingDateFields = [
  "closing_date",
  "closingDate",
  "closingdate",
  "close_date",
  "closeDate",
  "end_date",
  "endDate",
  "enddate",
  "last_date",
  "lastDate",
  "lastdate",
  "dueDate",
  "due_date",
  "deadline",
  "deadline_date",
  "valid_till",
];
const tenderNumberFields = [
  "tender_no",
  "tender_number",
  "tenderno",
  "tenderNo",
  "tender_id",
  "notice_no",
  "notice_number",
  "noticeId",
];

const docLinkConfigs = [
  {
    label: "Document",
    keys: [
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
    ],
  },
  {
    label: "Advertisement",
    keys: ["advertisement", "advertisement_url", "advertisementUrl"],
  },
  {
    label: "Corrigendum Document",
    keys: [
      "corrigendum_document",
      "corrigendumDoc",
      "corrigendum_url",
      "corrigendumUrl",
      "corrigendum_document_url",
    ],
    isCorrigendum: true,
  },
  {
    label: "Query Submission",
    keys: ["query_submission", "querySubmission", "query_submission_url", "querySubmissionUrl", "query"],
    isQuery: true,
  },
];

export default function Tender() {
  const state = useCmsPage("/resources/tenders");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  const tenderItems = useMemo(() => {
    if (!table?.rows?.length) return [];
    return (table.rows as TenderRow[])
      .map((row, idx) => parseTenderRow(row, idx + 1))
      .filter((item): item is TenderItem => Boolean(item));
  }, [table]);

  return (
    <ResourceLayout>
      <CmsContent {...state}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          {loading ? <Typography>Loading tenders…</Typography> : null}
          {error ? (
            <Typography color="error" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          ) : null}
          {!loading && !error && tenderItems.length === 0 ? (
            <Typography>No tenders available at the moment.</Typography>
          ) : null}

          {!loading && !error
            ? tenderItems.map((item) => <TenderCard key={item.id} tender={item} />)
            : null}
        </Box>
      </CmsContent>
    </ResourceLayout>
  );
}

function TenderCard({ tender }: { tender: TenderItem }) {
  const closingDay = tender.closingDay || "--";
  const closingMonth = tender.closingMonth || "";
  const closingYear = tender.closingYear || "";

  return (
    <Box
      sx={{
        borderRadius: "12px",
        boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
        border: "1px solid #d7e3f2",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <Box sx={{ background: "#01528f", color: "#e7f6ff", px: 2, py: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "16px" }}>
          Tender No:{" "}
          <MuiLink
            href={tender.href}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{ color: "#b7f5ff", fontWeight: 800 }}
          >
            {tender.tenderNumber || "—"}
          </MuiLink>
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, px: 1.5, py: 1.5, alignItems: "stretch" }}>
        <Box
          sx={{
            width: 120,
            minWidth: 120,
            borderRadius: "14px",
            background: "#01528f",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            py: 1.1,
            px: 0.8,
          }}
        >
          <Typography sx={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.15, textAlign: "center" }}>
            Closing Date
          </Typography>
          <Box
            sx={{
              mt: 0.9,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 0.8,
              width: "100%",
            }}
          >
            {closingYear ? (
              <Typography sx={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.16em", lineHeight: 1, pb: 0.4 }}>
                {closingYear}
              </Typography>
            ) : null}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
              <Typography sx={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.14em", lineHeight: 1 }}>
                {closingMonth || "TBD"}
              </Typography>
              <Typography sx={{ fontSize: "44px", fontWeight: 800, lineHeight: 0.9 }}>{closingDay}</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: "1 1 0%", display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#0b2240", lineHeight: 1.4 }}>
            {tender.title}
          </Typography>

          {tender.docLinks.length ? (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", color: "#0a529f" }}>
              <Typography sx={{ fontWeight: 700, color: "#0d2f63" }}>Tender Document</Typography>
              {tender.docLinks
                .filter((l) => !l.isCorrigendum && !l.isQuery)
                .map((link) => (
                  <MuiLink key={link.href} href={link.href} target="_blank" rel="noreferrer" underline="hover">
                    {link.label}
                  </MuiLink>
                ))}
            </Box>
          ) : null}

          {tender.dateRange ? (
            <Typography sx={{ color: "#475569", fontSize: "13px" }}>{tender.dateRange}</Typography>
          ) : null}
        </Box>

        {(tender.docLinks.some((l) => l.isCorrigendum) || tender.docLinks.some((l) => l.isQuery)) && (
          <Box sx={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 0.6 }}>
            {tender.docLinks
              .filter((l) => l.isCorrigendum || l.isQuery)
              .map((link) => (
                <Box key={link.href} sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
                  {link.isCorrigendum ? (
                    <Chip
                      label="New"
                      size="small"
                      sx={{ background: "#e62020", color: "#fff", fontWeight: 700, height: 22 }}
                    />
                  ) : null}
                  <MuiLink href={link.href} target="_blank" rel="noreferrer" underline="hover" sx={{ color: "#0a529f" }}>
                    {link.label}
                  </MuiLink>
                  {link.isQuery ? <MdNotificationsActive color="#9b1c1c" /> : null}
                </Box>
              ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function parseTenderRow(row: TenderRow, idx: number): TenderItem | null {
  const getField = createFieldGetter(row);
  const rawTitle = getField(...titleFields);
  const title = (typeof rawTitle === "string" ? rawTitle.trim() : "") || `Tender ${idx}`;
  if (!title) return null;

  const descriptionValue = getField(...descriptionFields);
  const description =
    typeof descriptionValue === "string" && descriptionValue.trim() ? descriptionValue.trim() : null;

  const tenderNumberValue = getField(...tenderNumberFields);
  const tenderNumber =
    tenderNumberValue != null ? String(tenderNumberValue).trim() || null : null;

  const startDateFieldValue = getField(...startDateFields);
  const endDateFieldValue = getField(...endDateFields);
  const startDate = formatDateDisplay(startDateFieldValue);
  const endDate = formatDateDisplay(endDateFieldValue);
  const explicitRange = formatDateRangeDisplay(getField(...dateRangeFields));
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : explicitRange || startDate || endDate || null;

  const closingFieldValue = getField(...closingDateFields);
  const closingDateMs =
    parseDateMs(closingFieldValue) ||
    parseDateMs(endDateFieldValue) ||
    parseDateMs(startDateFieldValue);
  const closingDate = closingDateMs ? new Date(closingDateMs) : null;
  const closingMonth = closingDate
    ? closingDate.toLocaleString("en-US", { month: "short" }).toUpperCase()
    : "";
  const closingDay = closingDate ? String(closingDate.getDate()).padStart(2, "0") : "--";
  const closingYear = closingDate ? String(closingDate.getFullYear()) : "";

  const docLinks = buildDocLinks(row);
  const href = docLinks[0]?.href || "/resources/tenders";

  return {
    id: String(row.id ?? row.tender_id ?? `${idx}`),
    title,
    description,
    dateRange,
    closingDay,
    closingMonth,
    closingYear,
    tenderNumber,
    docLinks,
    href,
  };
}

function createFieldGetter(row: TenderRow) {
  const lowerMap = new Map<string, unknown>(Object.keys(row).map((k) => [k.toLowerCase(), row[k]]));
  return function getField(...keys: string[]) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
      const lower = String(key).toLowerCase();
      if (lowerMap.has(lower)) return lowerMap.get(lower);
    }
    return undefined;
  };
}

function buildDocLinks(row: TenderRow): TenderDocLink[] {
  const getField = createFieldGetter(row);
  const links: TenderDocLink[] = [];

  for (const config of docLinkConfigs) {
    const rawValue = getField(...config.keys);
    const href = toPublicUrl(extractUrl(rawValue));
    if (!href) continue;
    if (links.some((link) => link.href === href)) continue;
    links.push({
      label: config.label,
      href,
      isCorrigendum: Boolean(config.isCorrigendum),
      isQuery: Boolean(config.isQuery),
    });
  }

  return links;
}

function extractUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractUrl(parsed);
      } catch {
        // ignore parse errors
      }
    }
    return trimmed;
  }
  if (Array.isArray(value) && value.length) return extractUrl(value[0]);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate =
      (typeof obj.url === "string" && obj.url) ||
      (typeof obj.path === "string" && obj.path) ||
      (typeof obj.file === "string" && obj.file) ||
      (typeof obj.filename === "string" && obj.filename);
    if (candidate) return candidate;
  }
  return null;
}

function normalizePublicUrl(url: string): string {
  let candidate = url.trim();
  const absoluteMatch = /^https?:\/\//i.test(candidate);
  const looksLikeFilename = /^[^\\/]+\\.(pdf|docx?|txt|xlsx?)$/i.test(candidate);
  if (!absoluteMatch && looksLikeFilename && !candidate.startsWith("/")) {
    candidate = `/uploads/media/${candidate}`;
  }
  if (!absoluteMatch && candidate.startsWith("uploads/")) {
    candidate = `/${candidate}`;
  }
  return candidate;
}

function toPublicUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return normalizePublicUrl(trimmed);
}

function parseDateMs(value: unknown): number {
  if (!value) return 0;
  const str = String(value).trim();
  if (!str) return 0;

  // Always prefer explicit D/M/Y parsing for slash/hyphen dates to avoid MM/DD misinterpretation.
  const dmy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s].*)?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    return new Date(year, month, day).getTime();
  }

  const ymd = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s].*)?$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    return new Date(year, month, day).getTime();
  }

  const date = new Date(str);
  if (!isNaN(date.getTime())) return date.getTime();
  return 0;
}

function formatDateDisplay(value: unknown): string | null {
  const ms = parseDateMs(value);
  if (!ms) return null;
  const date = new Date(ms);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function formatDateRangeDisplay(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const parts = str.match(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/g);
  if (!parts || parts.length < 2) return null;

  const start = formatDateDisplay(parts[0]);
  const end = formatDateDisplay(parts[1]);
  if (!start || !end) return null;
  return `${start} - ${end}`;
}
