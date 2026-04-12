import { api } from "./api";

export interface CmsNavigationItem {
  id: number;
  label: string;
  slug: string;
  path: string;
  description?: string | null;
  imagePath?: string | null;
  sortOrder?: number | null;
  children?: CmsNavigationItem[];
}

export interface CmsPageRecord {
  id: number;
  title: string | null;
  summary: string | null;
  body: string;
  heroImagePath: string | null;
  heroImagePaths: string[];
  heroImageCaptions: string[];
  publishedAt: string | null;
  showPublishDate?: boolean;
  updatedAt: string | null;
  label: string;
  slug: string;
  path: string;
  titleEn: string | null;
  summaryEn: string | null;
  bodyEn: string | null;
  titleOr: string | null;
  summaryOr: string | null;
  bodyOr: string | null;
  language: "en" | "or";
  dynamicTableName?: string | null;
  fontFamily?: string | null;
  fontColor?: string | null;
  backgroundColor?: string | null;
  pageLayout?: "default" | "narrow" | "wide" | "full" | null;
  attachmentsPaths: string[];
  attachmentsCaptions: string[];
  commonAttachmentsCaption: string | null;
}

interface CmsPageApiResponse {
  id: number;
  title: string | null;
  summary: string | null;
  body: string | null;
  heroImagePath: string | null;
  heroImagePaths?: string[] | null;
  heroImageCaptions?: string[] | null;
  publishedAt: string | null;
  showPublishDate?: boolean;
  updatedAt: string | null;
  label: string;
  slug: string;
  path: string;
  titleEn: string | null;
  summaryEn: string | null;
  bodyEn: string | null;
  titleOr: string | null;
  summaryOr: string | null;
  bodyOr: string | null;
  language?: "en" | "or" | null;
  dynamicTableName?: string | null;
  fontFamily?: string | null;
  fontColor?: string | null;
  backgroundColor?: string | null;
  pageLayout?: "default" | "narrow" | "wide" | "full" | null;
  attachmentsPaths?: string[] | null;
  attachmentsCaptions?: string[] | null;
  commonAttachmentsCaption?: string | null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeStringArray(parsed);
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeCmsRecord(record: CmsPageApiResponse): CmsPageRecord {
  return {
    id: record.id,
    title: record.title ?? null,
    summary: record.summary ?? null,
    body: record.body ?? "",
    heroImagePath: record.heroImagePath ?? null,
    heroImagePaths: normalizeStringArray(record.heroImagePaths),
    heroImageCaptions: normalizeStringArray(record.heroImageCaptions),
    attachmentsPaths: normalizeStringArray(record.attachmentsPaths),
    attachmentsCaptions: normalizeStringArray(record.attachmentsCaptions),
    publishedAt: record.publishedAt ?? null,
    showPublishDate: Boolean(record.showPublishDate),
    updatedAt: record.updatedAt ?? null,
    label: record.label,
    slug: record.slug,
    path: record.path,
    titleEn: record.titleEn ?? null,
    summaryEn: record.summaryEn ?? null,
    bodyEn: record.bodyEn ?? null,
    titleOr: record.titleOr ?? null,
    summaryOr: record.summaryOr ?? null,
    bodyOr: record.bodyOr ?? null,
    language: record.language === "or" ? "or" : "en",
    dynamicTableName: record.dynamicTableName ?? null,
    fontFamily: record.fontFamily ?? null,
    fontColor: record.fontColor ?? null,
    backgroundColor: record.backgroundColor ?? null,
    pageLayout: record.pageLayout ?? null,
    commonAttachmentsCaption: record.commonAttachmentsCaption ?? null,
  };
}

export type MediaCategory =
  | "photo"
  | "video"
  | "newspaper"
  | "audio"
  | "carousel";

export interface CmsMediaItem {
  id: number;
  filename: string;
  originalName: string | null;
  mimeType: string;
  category: MediaCategory;
  sizeBytes: number | string | null;
  altText: string | null;
  captionTextColor?: string | null;
  createdAt: string;
  url: string;
  albumId?: number | null;
  albumName?: string | null;
  albumSlug?: string | null;
  albumDescription?: string | null;
  albumSortOrder?: number | null;
}

export interface OrgUnit {
  id: number;
  parentId: number | null;
  name: string;
  title?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: OrgUnit[];
}

export interface CmsNewsItem {
  id: number | string;
  title: string;
  summary?: string | null;
  body?: string | null;
  slug?: string | null;
  url?: string | null;
  link?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  imageUrl?: string | null;
}

export interface CmsWhatsNewItem {
  id: number | string;
  title: string;
  description?: string | null;
  link?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}

export interface CmsFooterLink {
  section: "contact" | "policies" | "governance";
  label: string;
  path: string;
  sortOrder: number;
}

export async function fetchCmsNavigation(): Promise<CmsNavigationItem[]> {
  const response = await api.get<{ data: CmsNavigationItem[] }>(
    "/cms/navigation",
  );
  return response.data.data;
}

export async function fetchCmsPageByPath(
  path: string,
  lang: "en" | "or" = "en",
): Promise<CmsPageRecord | null> {
  try {
    const response = await api.get<{ data: CmsPageApiResponse }>("/cms/pages", {
      params: { path, lang },
    });
    return normalizeCmsRecord(response.data.data);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchCmsPageBySlug(
  slug: string,
  lang: "en" | "or" = "en",
): Promise<CmsPageRecord | null> {
  try {
    const response = await api.get<{ data: CmsPageApiResponse }>("/cms/pages", {
      params: { slug, lang },
    });
    return normalizeCmsRecord(response.data.data);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchCmsMedia(
  category: MediaCategory,
): Promise<CmsMediaItem[]> {
  const response = await api.get<{ data: CmsMediaItem[] }>("/cms/media", {
    params: { category },
  });
  return response.data.data;
}

export async function fetchOrgChartTree(): Promise<OrgUnit[]> {
  const response = await api.get<{ data: OrgUnit[] }>("/cms/org-chart");
  return response.data.data;
}

export async function fetchCmsFooterLinks(): Promise<CmsFooterLink[]> {
  const response = await api.get<{ data: CmsFooterLink[] }>("/cms/footer-links");
  return response.data.data;
}

export async function fetchCmsNews(limit = 20): Promise<CmsNewsItem[]> {
  const response = await api.get<{ data: CmsNewsItem[] }>("/news", {
    params: { limit },
  });
  return response.data.data;
}

export async function fetchNewsItem(id: number | string): Promise<CmsNewsItem> {
  const response = await api.get<{ data: CmsNewsItem }>(`/news/${id}`);
  return response.data.data;
}

export async function fetchWhatsNew(limit = 20): Promise<CmsWhatsNewItem[]> {
  const response = await api.get<{ data: CmsWhatsNewItem[] }>("/whats-new", {
    params: { limit },
  });
  return response.data.data;
}
