import React, { useMemo } from "react";
import { TableColumn, TableResponse } from "../../hooks/useCmsTable";

type CmsTableProps = {
  table: TableResponse | null;
  hiddenColumns?: string[];
  emptyText?: string;
  title?: string;
  renderMode?: "table" | "row-image-right";
  rowImageMaxWidth?: string;
  showSerialNumber?: boolean;
};

export default function CmsTable({
  table,
  hiddenColumns = [],
  emptyText = "No entries available.",
  title,
  renderMode = "table",
  rowImageMaxWidth = "400px",
  showSerialNumber = true,
}: CmsTableProps) {
  const visibleColumns = useMemo(() => {
    if (!table) return [] as TableColumn[];
    const hidden = new Set(
      ["id", "created_at", ...hiddenColumns].map((h) =>
        String(h).toLowerCase(),
      ),
    );
    return table.columns.filter((col) => !hidden.has(col.name.toLowerCase()));
  }, [table, hiddenColumns]);

  const sortedRows = useMemo(() => {
    if (!table) {
      return [] as Record<string, unknown>[];
    }

    const serialColumn = visibleColumns.find((col) =>
      isSerialColumnName(col.name),
    );
    if (!serialColumn) {
      return table.rows as Record<string, unknown>[];
    }

    return [...(table.rows as Record<string, unknown>[])].sort(
      (leftRow, rightRow) => {
        const leftValue = getRowField(leftRow, serialColumn.name);
        const rightValue = getRowField(rightRow, serialColumn.name);
        return compareSerialValues(leftValue, rightValue);
      },
    );
  }, [table, visibleColumns]);

  if (!table || !visibleColumns.length) return null;

  if (table.rows.length === 0) {
    return <p>{emptyText}</p>;
  }

  if (renderMode === "row-image-right") {
    const rowItems = buildRowItems(sortedRows, visibleColumns);
    if (rowItems.length > 0) {
      return (
        <div style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
          {rowItems.map((item, idx) => (
            <article
              key={idx}
              style={{
                border: "1px solid #d5d5d5",
                borderRadius: "8px",
                padding: "14px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  flex: "1 1 320px",
                  minWidth: 0,
                  color: "#1b2f5b",
                  fontSize: "17px",
                  lineHeight: 1.7,
                }}
              >
                {item.content.map((entry, contentIndex) => (
                  <p
                    key={`${entry.label}-${contentIndex}`}
                    style={{ margin: contentIndex === 0 ? 0 : "8px 0 0" }}
                  >
                    {entry.label ? <strong>{entry.label}: </strong> : null}
                    <span style={{ whiteSpace: "pre-line" }}>
                      {entry.value}
                    </span>
                  </p>
                ))}
              </div>
              <div
                style={{
                  flex: `0 1 ${rowImageMaxWidth}`,
                  width: "100%",
                  maxWidth: rowImageMaxWidth,
                  display: "grid",
                  gap: "10px",
                }}
              >
                {item.images.map((url, imageIndex) => (
                  <img
                    key={`${url}-${imageIndex}`}
                    src={url}
                    alt=""
                    style={{
                      width: "100%",
                      borderRadius: "6px",
                      display: "block",
                    }}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      );
    }
  }

  const headerBg = "#216db3";
  const headerText = "#ffffff";
  const bodyText = "#111827";
  const borderColor = "#cfcfcf";
  const oddRowBg = "#f3f3f3";
  const evenRowBg = "#e8e8e8";

  const thStyle: React.CSSProperties = {
    background: headerBg,
    color: headerText,
    fontWeight: 600,
    padding: "10px 12px",
    border: `1px solid ${borderColor}`,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontSize: "15px",
  };

  const thCenterStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: "left",
    width: "90px",
  };

  const tdStyle: React.CSSProperties = {
    padding: "11px 12px",
    border: `1px solid ${borderColor}`,
    verticalAlign: "top",
    color: bodyText,
    fontSize: "16px",
    lineHeight: 1.35,
  };

  const tdCenterStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: "left",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        marginTop: "16px",
        borderRadius: "0",
        boxShadow: "none",
        border: `1px solid ${borderColor}`,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "640px",
        }}
      >
        <thead>
          {title ? (
            <tr>
              <th
                colSpan={visibleColumns.length + (showSerialNumber ? 1 : 0)}
                style={{
                  ...thStyle,
                  textAlign: "center",
                  fontSize: "16px",
                  fontWeight: 700,
                  padding: "12px",
                }}
              >
                {title}
              </th>
            </tr>
          ) : null}
          <tr>
            {showSerialNumber ? <th style={thCenterStyle}>Sr. No.</th> : null}
            {visibleColumns.map((col) => (
              <th key={col.name} style={thStyle}>
                {toTitleCase(col.name)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr key={idx}>
              <td style={tdCenterStyle}>{idx + 1}</td>
              {visibleColumns.map((col) => (
                <td key={col.name} style={tdStyle}>
                  {formatCell(
                    getRowField(row as Record<string, unknown>, col.name),
                    col.name,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildRowItems(
  rows: Record<string, unknown>[],
  visibleColumns: TableColumn[],
) {
  return rows
    .map((row) => {
      const content: Array<{ label: string; value: string }> = [];
      const images: string[] = [];

      visibleColumns.forEach((col) => {
        const value = getRowField(row, col.name);
        const imageUrls = extractImageUrls(value, col.name);

        if (imageUrls.length > 0) {
          images.push(...imageUrls);
          return;
        }

        const text = extractTextValue(value);
        if (!text) return;

        content.push({
          label: formatLabel(col.name),
          value: text,
        });
      });

      if (!images.length || !content.length) {
        return null;
      }

      return {
        images,
        content: prioritizeContent(content),
      };
    })
    .filter(
      (
        item,
      ): item is {
        images: string[];
        content: Array<{ label: string; value: string }>;
      } => item !== null,
    );
}

function prioritizeContent(content: Array<{ label: string; value: string }>) {
  const important = content.filter((entry) =>
    /content|description|details|body|summary|text|title/i.test(entry.label),
  );
  if (important.length) return important;
  return content;
}

function formatLabel(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractTextValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function extractImageUrls(value: unknown, columnName: string): string[] {
  const urls: string[] = [];

  const pushIfImageLike = (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed) return;

    const lowerCol = columnName.toLowerCase();
    const imageColumnHint =
      /(image|photo|picture|banner|hero|thumbnail|media)/i.test(lowerCol);
    const imageExt = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(trimmed);
    const imageData = /^data:image\//i.test(trimmed);
    const uploadPath = /(^\/uploads\/)|(^uploads\/)/i.test(trimmed);
    const absoluteHttp = /^https?:\/\//i.test(trimmed);

    if (
      imageExt ||
      imageData ||
      (imageColumnHint &&
        (uploadPath || absoluteHttp || !trimmed.includes(" ")))
    ) {
      urls.push(resolveMediaUrl(trimmed));
    }
  };

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (typeof entry === "string") pushIfImageLike(entry);
    });
    return dedupe(urls);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach((entry) => {
            if (typeof entry === "string") pushIfImageLike(entry);
          });
          return dedupe(urls);
        }
      } catch {}
    }

    if (trimmed.includes(",")) {
      trimmed.split(",").forEach((part) => pushIfImageLike(part));
      return dedupe(urls);
    }

    pushIfImageLike(trimmed);
  }

  return dedupe(urls);
}

function resolveMediaUrl(rawPath: string): string {
  if (
    /^(https?:)?\/\//i.test(rawPath) ||
    rawPath.startsWith("data:") ||
    rawPath.startsWith("blob:")
  ) {
    return rawPath;
  }

  const normalizedPath = (() => {
    if (rawPath.startsWith("/uploads/")) {
      return rawPath;
    }
    if (rawPath.startsWith("uploads/")) {
      return `/${rawPath}`;
    }
    if (!rawPath.includes("/") && !rawPath.startsWith("/")) {
      return `/uploads/media/${rawPath}`;
    }
    return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  })();

  const apiBase = String(import.meta.env.VITE_API_URL || "").trim();
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      const apiUrl = new URL(apiBase);
      return `${apiUrl.origin}${normalizedPath}`;
    } catch {
      return normalizedPath;
    }
  }

  return normalizedPath;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function toTitleCase(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRowField(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }

  const lowered = new Map<string, unknown>(
    Object.keys(row).map((k) => [k.toLowerCase(), row[k]]),
  );
  for (const key of keys) {
    const value = lowered.get(String(key).toLowerCase());
    if (value !== undefined) return value;
  }

  return null;
}

function isSerialColumnName(columnName: string): boolean {
  const normalized = columnName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized === "slno" ||
    normalized === "serialno" ||
    normalized === "serialnumber" ||
    normalized === "sno"
  );
}

function toSerialNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return Number.POSITIVE_INFINITY;
    }

    const numeric = Number(trimmed.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function compareSerialValues(leftValue: unknown, rightValue: unknown): number {
  return toSerialNumber(leftValue) - toSerialNumber(rightValue);
}

function formatCell(value: unknown, columnName: string) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const url = value.trim();
    const isLikelyDoc =
      /\.pdf($|\?)/i.test(url) || /doc|file|attachment/i.test(columnName);
    const isHttpUrl = /^https?:\/\/\S+/i.test(url);
    const isLinkColumn = /url|website|link/i.test(columnName.toLowerCase());
    const looksLikeDomain =
      /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#].*)?$/i.test(url);

    if (isLikelyDoc) {
      const href = /^https?:/i.test(url)
        ? url
        : `${url.startsWith("/") ? url : `/${url}`}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title="View document"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#0069d9",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <span aria-hidden>[PDF]</span>
          <span style={{ textDecoration: "underline" }}>View</span>
        </a>
      );
    }

    if (isHttpUrl || (isLinkColumn && looksLikeDomain)) {
      const href = isHttpUrl ? url : `https://${url}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title="Open website"
          style={{ color: "#0069d9", textDecoration: "none", fontWeight: 500 }}
        >
          {url}
        </a>
      );
    }

    return url;
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
