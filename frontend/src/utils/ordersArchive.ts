export type ArchiveMonth = {
  month: number;
  label: string;
};

export type ArchiveYear = {
  year: number;
  label: string;
  months: ArchiveMonth[];
};

type TableColumnLike = {
  name: string;
};

const YEAR_COLUMN_CANDIDATES = ["year", "order_year", "case_year", "yr", "year_no", "year_number"];
const MONTH_COLUMN_CANDIDATES = ["month", "order_month", "case_month", "month_no", "month_number", "mnth"];
const DATE_COLUMN_CANDIDATES = [
  "order_date",
  "date_of_order",
  "order_dt",
  "hearing_date",
  "date_of_hearing",
  "judgement_date",
  "case_date",
  "order_on",
  "order_passed_on",
  "interim_order_date",
  "suo_moto_date",
  "date_of_case",
  "date",
];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

type YearMonth = {
  year: number;
  month: number;
};

type YearOnly = {
  year: number;
};

type YearParseOptions = {
  allowShortYear?: boolean;
};

function shouldIgnoreArchiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized === "id" ||
    normalized === "createdat" ||
    normalized === "updatedat" ||
    normalized === "modifiedat" ||
    normalized === "deletedat"
  );
}

function toComparableColumnName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isLikelyTemporalField(fieldName: string): boolean {
  const normalized = toComparableColumnName(fieldName);
  if (!normalized || shouldIgnoreArchiveField(fieldName)) {
    return false;
  }

  const tokens = normalized.split("_");
  return tokens.some((token) =>
    ["year", "month", "date", "dt", "hearing", "judgement", "judgment", "order", "interim", "suo", "moto"].includes(
      token
    )
  );
}

function getRowField(row: Record<string, unknown>, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const lowerKey = key.toLowerCase();
  const found = Object.keys(row).find((rowKey) => rowKey.toLowerCase() === lowerKey);
  if (!found) {
    return undefined;
  }

  return row[found];
}

function findColumnName(columns: TableColumnLike[] | undefined, candidates: string[]): string | null {
  if (!columns?.length) {
    return null;
  }

  const normalizedCandidates = new Set(candidates.map((item) => toComparableColumnName(item)));
  const exact = columns.find((column) => normalizedCandidates.has(toComparableColumnName(column.name)));
  if (exact) {
    return exact.name;
  }

  const contains = columns.find((column) => {
    const normalizedColumn = toComparableColumnName(column.name);
    return Array.from(normalizedCandidates).some((candidate) => {
      return (
        normalizedColumn.startsWith(`${candidate}_`) ||
        normalizedColumn.endsWith(`_${candidate}`) ||
        normalizedColumn.includes(`_${candidate}_`)
      );
    });
  });

  return contains?.name ?? null;
}

function normalizeShortYear(value: number): number | null {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    return null;
  }

  const normalized = 2000 + value;
  if (normalized >= 1900 && normalized <= 3000) {
    return normalized;
  }

  return null;
}

function toValidYear(value: unknown, options: YearParseOptions = {}): number | null {
  const { allowShortYear = false } = options;

  if (typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= 3000) {
    return value;
  }

  if (typeof value === "number" && allowShortYear) {
    const shortYear = normalizeShortYear(value);
    if (shortYear) {
      return shortYear;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}$/.test(trimmed)) {
      const num = Number(trimmed);
      if (num >= 1900 && num <= 3000) {
        return num;
      }
    }

    if (allowShortYear && /^\d{2}$/.test(trimmed)) {
      const shortYear = normalizeShortYear(Number(trimmed));
      if (shortYear) {
        return shortYear;
      }
    }
  }

  return null;
}

function toValidMonth(value: unknown): number | null {
  if (typeof value === "number") {
    const monthNum = Math.trunc(value);
    if (monthNum >= 1 && monthNum <= 12) {
      return monthNum;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{1,2}$/.test(trimmed)) {
      const monthNum = Number(trimmed);
      if (monthNum >= 1 && monthNum <= 12) {
        return monthNum;
      }
    }

    const normalized = trimmed.toLowerCase();
    if (MONTH_NAME_TO_NUMBER[normalized]) {
      return MONTH_NAME_TO_NUMBER[normalized];
    }
  }

  return null;
}

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function parseMonthYearFromText(value: unknown): YearMonth | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const monthNames = Object.keys(MONTH_NAME_TO_NUMBER).sort((a, b) => b.length - a.length).join("|");

  const monthYearMatch = normalized.match(new RegExp(`\\b(${monthNames})\\s+(\\d{4})\\b`, "i"));
  if (monthYearMatch) {
    const month = MONTH_NAME_TO_NUMBER[monthYearMatch[1].toLowerCase()];
    const year = Number(monthYearMatch[2]);
    if (month && year >= 1900 && year <= 3000) {
      return { year, month };
    }
  }

  const yearMonthMatch = normalized.match(new RegExp(`\\b(\\d{4})\\s+(${monthNames})\\b`, "i"));
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1]);
    const month = MONTH_NAME_TO_NUMBER[yearMonthMatch[2].toLowerCase()];
    if (month && year >= 1900 && year <= 3000) {
      return { year, month };
    }
  }

  const dayMonthYearMatch = normalized.match(/\b\d{1,2}[./-](\d{1,2})(?:[./-]\d{1,2})?[./-](\d{4})\b/);
  if (dayMonthYearMatch) {
    const month = Number(dayMonthYearMatch[1]);
    const year = Number(dayMonthYearMatch[2]);
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 3000) {
      return { year, month };
    }
  }

  return null;
}

function parseYearFromText(value: unknown): YearOnly | null {
  if (typeof value === "number") {
    const year = toValidYear(value);
    return year ? { year } : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const yearMatch = normalized.match(/\b(19\d{2}|20\d{2}|21\d{2}|22\d{2}|23\d{2}|24\d{2}|25\d{2}|26\d{2}|27\d{2}|28\d{2}|29\d{2}|3000)\b/);
  if (!yearMatch) {
    return null;
  }

  const year = Number(yearMatch[1]);
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    return null;
  }

  return { year };
}

function extractYearMonth(
  row: Record<string, unknown>,
  columns?: TableColumnLike[]
): YearMonth | null {
  const yearColumn = findColumnName(columns, YEAR_COLUMN_CANDIDATES);
  const monthColumn = findColumnName(columns, MONTH_COLUMN_CANDIDATES);

  if (yearColumn && monthColumn) {
    const year = toValidYear(getRowField(row, yearColumn), { allowShortYear: true });
    const month = toValidMonth(getRowField(row, monthColumn));
    if (year && month) {
      return { year, month };
    }
  }

  const dateColumn = findColumnName(columns, DATE_COLUMN_CANDIDATES);

  if (dateColumn) {
    const parsed = parseDateLike(getRowField(row, dateColumn));
    if (parsed) {
      return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
      };
    }
  }

  const allEntries = Object.entries(row).filter(([key]) => !shouldIgnoreArchiveField(key));
  const temporalEntries = allEntries.filter(([key]) => isLikelyTemporalField(key));

  for (const [, value] of temporalEntries) {
    const fromText = parseMonthYearFromText(value);
    if (fromText) {
      return fromText;
    }

    const parsed = parseDateLike(value);
    if (parsed) {
      return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
      };
    }
  }

  for (const [, value] of allEntries) {
    const fromText = parseMonthYearFromText(value);
    if (fromText) {
      return fromText;
    }
  }

  return null;
}

function extractYear(
  row: Record<string, unknown>,
  columns?: TableColumnLike[]
): number | null {
  const yearColumn = findColumnName(columns, YEAR_COLUMN_CANDIDATES);

  if (yearColumn) {
    const year = toValidYear(getRowField(row, yearColumn), { allowShortYear: true });
    if (year) {
      return year;
    }
  }

  const dateColumn = findColumnName(columns, DATE_COLUMN_CANDIDATES);

  if (dateColumn) {
    const parsed = parseDateLike(getRowField(row, dateColumn));
    if (parsed) {
      return parsed.getUTCFullYear();
    }
  }

  const allEntries = Object.entries(row).filter(([key]) => !shouldIgnoreArchiveField(key));
  const temporalEntries = allEntries.filter(([key]) => isLikelyTemporalField(key));

  for (const [, value] of temporalEntries) {
    const fromText = parseYearFromText(value);
    if (fromText) {
      return fromText.year;
    }

    const parsed = parseDateLike(value);
    if (parsed) {
      return parsed.getUTCFullYear();
    }
  }

  for (const [, value] of allEntries) {
    const fromMonthYearText = parseMonthYearFromText(value);
    if (fromMonthYearText) {
      return fromMonthYearText.year;
    }
  }

  return null;
}

export function buildOrdersArchive(
  rows: Record<string, unknown>[],
  columns?: TableColumnLike[]
): ArchiveYear[] {
  const yearMap = new Map<number, Set<number>>();

  rows.forEach((row) => {
    const ym = extractYearMonth(row, columns);
    if (ym) {
      if (!yearMap.has(ym.year)) {
        yearMap.set(ym.year, new Set<number>());
      }

      yearMap.get(ym.year)?.add(ym.month);
      return;
    }

    const yearOnly = extractYear(row, columns);
    if (!yearOnly) {
      return;
    }

    if (!yearMap.has(yearOnly)) {
      yearMap.set(yearOnly, new Set<number>());
    }
  });

  return Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthsSet]) => {
      const months = Array.from(monthsSet)
        .sort((a, b) => b - a)
        .map((month) => ({
          month,
          label: `${MONTH_LABELS[month - 1]} ${year} Orders`,
        }));

      return {
        year,
        label: `Orders ${year}`,
        months,
      };
    });
}

export function filterRowsByYearMonth(
  rows: Record<string, unknown>[],
  year: number,
  month: number,
  columns?: TableColumnLike[]
): Record<string, unknown>[] {
  return rows.filter((row) => {
    const ym = extractYearMonth(row, columns);
    return ym?.year === year && ym.month === month;
  });
}

export function filterRowsByYear(
  rows: Record<string, unknown>[],
  year: number,
  columns?: TableColumnLike[]
): Record<string, unknown>[] {
  return rows.filter((row) => {
    const ym = extractYearMonth(row, columns);
    if (ym) {
      return ym.year === year;
    }

    const y = extractYear(row, columns);
    return y === year;
  });
}
