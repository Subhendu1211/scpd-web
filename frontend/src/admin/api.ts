import axios from "axios";

export type AdminRole =
  | "superadmin"
  | "admin"
  | "author"
  | "department_reviewer"
  | "editor"
  | "publishing_officer";

export interface AdminLoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: AdminRole;
    fullName?: string | null;
    phone?: string | null;
  };
}

const adminApi = axios.create({
  baseURL: "/api/admin",
  withCredentials: false,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("scpd_admin_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function login(email: string, password: string) {
  return adminApi
    .post<AdminLoginResponse>("/auth/login", { email, password })
    .then((res) => res.data);
}

export interface PasswordResetRequestResponse {
  success: boolean;
  channel?: "email" | "sms";
  destination?: string | null;
}

export function requestAdminPasswordReset(payload: {
  email?: string;
  phone?: string;
  channel?: "email" | "sms";
}) {
  return adminApi
    .post<PasswordResetRequestResponse>("/auth/forgot-password", payload)
    .then((res) => res.data);
}

export function resetAdminPassword(payload: {
  email: string;
  otp: string;
  password: string;
}) {
  return adminApi
    .post<{ success: boolean }>("/auth/reset-password", payload)
    .then((res) => res.data);
}

export interface MenuItemPayload {
  id?: number;
  parentId: number | null;
  label: string;
  slug: string;
  path: string;
  description?: string | null;
  imagePath?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: MenuItemPayload[];
}

export function fetchMenuTree() {
  return adminApi
    .get<{ data: MenuItemPayload[] }>("/menu-items")
    .then((res) => res.data.data)
    .catch((err) => {
      console.error("fetchMenuTree error", err?.response?.data || err);
      throw err;
    });
}

export function createMenu(payload: Partial<MenuItemPayload>) {
  return adminApi
    .post<{ data: MenuItemPayload }>("/menu-items", payload)
    .then((res) => res.data.data);
}

export function updateMenu(id: number, payload: Partial<MenuItemPayload>) {
  return adminApi
    .patch<{ data: MenuItemPayload }>(`/menu-items/${id}`, payload)
    .then((res) => res.data.data);
}

export function reorderMenu(
  id: number,
  parentId: number | null,
  sortOrder: number,
) {
  return adminApi
    .patch<{
      data: MenuItemPayload;
    }>(`/menu-items/${id}/order`, { parentId, sortOrder })
    .then((res) => res.data.data);
}

export function deleteMenu(id: number) {
  return adminApi.delete(`/menu-items/${id}`);
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
  metadata?: Record<string, unknown> | null;
  children?: OrgUnit[];
}

export function fetchOrgChart() {
  return adminApi
    .get<{ data: OrgUnit[] }>("/cms/org-chart")
    .then((res) => res.data.data);
}

export function createOrgUnit(payload: Partial<OrgUnit> & { name: string }) {
  return adminApi
    .post<{ data: OrgUnit }>("/cms/org-chart", payload)
    .then((res) => res.data.data);
}

export function updateOrgUnit(id: number, payload: Partial<OrgUnit>) {
  return adminApi
    .patch<{ data: OrgUnit }>(`/cms/org-chart/${id}`, payload)
    .then((res) => res.data.data);
}

export function reorderOrgUnit(
  id: number,
  parentId: number | null,
  sortOrder: number,
) {
  return adminApi
    .patch<{
      data: OrgUnit;
    }>(`/cms/org-chart/${id}/order`, { parentId, sortOrder })
    .then((res) => res.data.data);
}

export function deleteOrgUnit(id: number) {
  return adminApi.delete(`/cms/org-chart/${id}`);
}

export type MediaCategory =
  | "photo"
  | "video"
  | "newspaper"
  | "audio"
  | "carousel";

export interface CmsPage {
  id?: number;
  menuItemId: number | null;
  customPath?: string | null;
  customLabel?: string | null;
  title: string;
  summary: string | null;
  body: string | null;
  titleOr: string | null;
  summaryOr: string | null;
  bodyOr: string | null;
  heroImagePath: string | null;
  heroImagePaths?: string[] | null;
  heroImageCaptions?: string[] | null;
  attachmentsPaths?: string[] | null;
  attachmentsCaptions?: string[] | null;
  status: CmsPageStatus;
  publishedAt?: string | null;
  showPublishDate?: boolean;
  updatedAt?: string;
  menuLabel?: string;
  menuPath?: string;
  menuSlug?: string;
  showInFooter?: boolean;
  footerSection?: "contact" | "policies" | "governance" | null;
  footerLabel?: string | null;
  footerOrder?: number | null;
  dynamicTableName?: string | null;
  fontFamily?: string | null;
  fontColor?: string | null;
  backgroundColor?: string | null;
  pageLayout?: "default" | "narrow" | "wide" | "full" | null;
}

export type CmsPageStatus =
  | "draft"
  | "department_review"
  | "editor_review"
  | "publishing_review"
  | "published";

export function fetchPages(status?: string) {
  return adminApi
    .get<{ data: CmsPage[] }>("/pages", {
      params: status ? { status } : undefined,
    })
    .then((res) => res.data.data)
    .catch((err) => {
      console.error("fetchPages error", err?.response?.data || err);
      throw err;
    });
}

export function fetchPageByMenu(menuItemId: number) {
  return adminApi
    .get<{ data: CmsPage | null }>(`/pages/${menuItemId}`)
    .then((res) => res.data.data ?? null)
    .catch((err) => {
      console.error("fetchPageByMenu error", err?.response?.data || err);
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    });
}

export function upsertPage(payload: CmsPage & { adminUserId?: number | null }) {
  return adminApi
    .post<{ data: CmsPage }>("/pages", payload)
    .then((res) => res.data.data);
}

export interface MediaItem {
  id: number;
  filename: string;
  originalName?: string | null;
  altText?: string | null;
  captionTextColor?: string | null;
  mimeType: string;
  sizeBytes?: number | string | null;
  category: MediaCategory;
  url: string;
  createdAt: string;
  albumId?: number | null;
  albumName?: string | null;
  albumSlug?: string | null;
  albumDescription?: string | null;
  albumSortOrder?: number | null;
}

export function listMedia() {
  return adminApi
    .get<{ data: MediaItem[] }>("/media")
    .then((res) => res.data.data);
}

export interface MediaAlbum {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  coverMediaId?: number | null;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
}

export function listMediaAlbums() {
  return adminApi
    .get<{ data: MediaAlbum[] }>("/media-albums")
    .then((res) => res.data.data);
}

export function createMediaAlbum(payload: {
  name: string;
  description?: string | null;
  sortOrder?: number;
  coverMediaId?: number | null;
}) {
  return adminApi
    .post<{ data: MediaAlbum }>("/media-albums", payload)
    .then((res) => res.data.data);
}

export function updateMediaAlbum(
  id: number,
  payload: Partial<{
    name: string;
    description: string | null;
    sortOrder: number;
    coverMediaId: number | null;
  }>,
) {
  return adminApi
    .patch<{ data: MediaAlbum }>(`/media-albums/${id}`, payload)
    .then((res) => res.data.data);
}

export function deleteMediaAlbum(id: number) {
  return adminApi.delete(`/media-albums/${id}`);
}

export function uploadMedia(
  file: File,
  options: {
    category: MediaCategory;
    altText?: string;
    captionTextColor?: string;
    albumId?: number | null;
  },
) {
  const data = new FormData();
  data.append("file", file);
  data.append("category", options.category);
  if (options.altText) {
    data.append("altText", options.altText);
  }
  if (options.captionTextColor) {
    data.append("captionTextColor", options.captionTextColor);
  }
  if (options.albumId) {
    data.append("albumId", String(options.albumId));
  }
  // Let the browser set multipart/form-data boundary.
  return adminApi.post<{ data: MediaItem }>("/media", data);
}

export interface BulkUploadResult {
  data: MediaItem[];
  failed: Array<{ name: string; error: string }>;
}

export function uploadMediaBulk(
  files: Array<{ file: File; altText: string }>,
  options: {
    category: MediaCategory;
    captionTextColor?: string;
    albumId?: number | null;
  },
) {
  const data = new FormData();
  for (const { file, altText } of files) {
    data.append("files", file);
    if (altText) {
      data.append(`altText_${file.name}`, altText);
    }
  }
  data.append("category", options.category);
  if (options.captionTextColor) {
    data.append("captionTextColor", options.captionTextColor);
  }
  if (options.albumId) {
    data.append("albumId", String(options.albumId));
  }
  return adminApi.post<BulkUploadResult>("/media/bulk", data);
}

export function deleteMediaItem(id: number) {
  return adminApi.delete(`/media/${id}`);
}

export function updateMediaItem(
  id: number,
  payload: Partial<{
    altText: string | null;
    captionTextColor: string | null;
    albumId: number | null;
    category: MediaCategory;
  }>,
) {
  return adminApi
    .patch<{ data: MediaItem }>(`/media/${id}`, payload)
    .then((res) => res.data.data);
}

export interface AdminNewsItem {
  id: number;
  title: string;
  body?: string | null;
  publishedAt?: string | null;
  imageUrl?: string | null;
}

export function listNews(limit = 200) {
  return adminApi
    .get<{ data: AdminNewsItem[] }>(`/news`, { params: { limit } })
    .then((res) => res.data.data);
}

export interface AdminNewsPayload {
  title: string;
  body?: string | null;
  publishedAt?: string | null;
  image?: File | null;
  imageUrl?: string | null;
  removeImage?: boolean;
}

function buildAdminNewsRequestBody(
  payload: Partial<AdminNewsPayload>,
  requireTitle = false,
) {
  if (payload.image || payload.removeImage) {
    const data = new FormData();
    if (requireTitle || payload.title !== undefined) {
      data.append("title", payload.title ?? "");
    }
    if (payload.body !== undefined) {
      data.append("body", payload.body ?? "");
    }
    if (payload.publishedAt !== undefined && payload.publishedAt !== null) {
      data.append("publishedAt", payload.publishedAt);
    }
    if (payload.imageUrl) {
      data.append("imageUrl", payload.imageUrl);
    }
    if (payload.removeImage) {
      data.append("removeImage", "true");
    }
    if (payload.image) {
      data.append("image", payload.image);
    }
    return data;
  }

  return {
    title: payload.title,
    body: payload.body ?? null,
    publishedAt: payload.publishedAt ?? null,
    imageUrl: payload.imageUrl ?? null,
  };
}

export function createNews(payload: AdminNewsPayload) {
  return adminApi
    .post<{ data: AdminNewsItem }>(
      `/news`,
      buildAdminNewsRequestBody(payload, true),
    )
    .then((res) => res.data.data);
}

export function updateNews(id: number, payload: Partial<AdminNewsPayload>) {
  const requestBody =
    payload.image || payload.removeImage
      ? buildAdminNewsRequestBody(payload)
      : payload;

  return adminApi
    .patch<{ data: AdminNewsItem }>(`/news/${id}`, requestBody)
    .then((res) => res.data.data);
}

export function deleteNews(id: number) {
  return adminApi
    .delete<{ data: AdminNewsItem }>(`/news/${id}`)
    .then((res) => res.data.data);
}

export interface AdminEvent {
  id: number;
  title: string;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  isDeleted?: boolean | null;
}

export function listEvents(limit = 200) {
  return adminApi
    .get<{ data: AdminEvent[] }>(`/events`, { params: { limit } })
    .then((res) => res.data.data);
}

export function createEvent(payload: {
  title: string;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
}) {
  return adminApi
    .post<{ data: AdminEvent }>(`/events`, payload)
    .then((res) => res.data.data);
}

export function updateEvent(id: number, payload: Partial<AdminEvent>) {
  return adminApi
    .patch<{ data: AdminEvent }>(`/events/${id}`, payload)
    .then((res) => res.data.data);
}

export function deleteEvent(id: number) {
  return adminApi
    .delete<{ data: AdminEvent }>(`/events/${id}`)
    .then((res) => res.data.data);
}


export interface AdminFeedbackSubmission {
  id: number;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  createdAt?: string | null;
}

export function listFeedbackSubmissions(limit = 300) {
  return adminApi
    .get<{
      data: AdminFeedbackSubmission[];
    }>(`/feedback`, { params: { limit } })
    .then((res) => res.data.data);
}

export interface AdminWhatsNewItem {
  id: number;
  title: string;
  description?: string | null;
  link?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}

export function listWhatsNew(limit = 200) {
  return adminApi
    .get<{ data: AdminWhatsNewItem[] }>(`/whats-new`, { params: { limit } })
    .then((res) => res.data.data);
}

export function createWhatsNew(payload: {
  title: string;
  description?: string | null;
  link?: string | null;
  publishedAt?: string | null;
}) {
  return adminApi
    .post<{ data: AdminWhatsNewItem }>(`/whats-new`, payload)
    .then((res) => res.data.data);
}

export function deleteWhatsNew(id: number) {
  return adminApi
    .delete<{ data: AdminWhatsNewItem }>(`/whats-new/${id}`)
    .then((res) => res.data.data);
}

export interface AdminUser {
  id: number;
  email: string;
  role: AdminRole;
  fullName?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export function listAdminUsers() {
  return adminApi
    .get<{ data: AdminUser[] }>("/users")
    .then((res) => res.data.data);
}

export function createAdminUser(payload: {
  email: string;
  password: string;
  role: AdminRole;
  fullName?: string | null;
  phone?: string | null;
  isActive?: boolean;
}) {
  return adminApi
    .post<{ data: AdminUser }>("/users", payload)
    .then((res) => res.data.data);
}

export type AuditScope = "user" | "workflow";

export interface AdminUserLog {
  id: number;
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface PageWorkflowLog {
  id: number;
  pageId: number;
  menuItemId: number;
  menuLabel?: string | null;
  menuPath?: string | null;
  actorId?: number | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
  scope: AuditScope;
}

export function fetchAuditLogs(scope: AuditScope, page = 1, pageSize = 25) {
  return adminApi
    .get<AuditLogResponse<AdminUserLog | PageWorkflowLog>>("/logs", {
      params: { scope, page, pageSize },
    })
    .then((res) => res.data);
}

export type ColumnDataType =
  | "text"
  | "doc"
  | "varchar"
  | "integer"
  | "bigint"
  | "boolean"
  | "date"
  | "timestamp"
  | "timestamptz"
  | "jsonb"
  | "uuid"
  | "numeric";

export interface DynamicTableColumnInput {
  name: string;
  type: ColumnDataType;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  defaultValue?: string;
}

export interface DynamicTableColumnSummary {
  name: string;
  type: ColumnDataType;
  sqlType: string;
  isPrimaryKey: boolean;
  nullable: boolean;
  defaultValue: string | null;
}

export interface DynamicTableDefinition {
  tableName: string;
  columns: DynamicTableColumnSummary[];
  displayName?: string;
  exposeFrontend?: boolean;
  headerBgColor?: string | null;
  headerTextColor?: string | null;
  bodyTextColor?: string | null;
}

export function createDynamicTable(payload: {
  tableName: string;
  columns: DynamicTableColumnInput[];
}) {
  return adminApi
    .post<{ data: DynamicTableDefinition }>("/cms/tables", payload)
    .then((res) => res.data.data);
}

export interface DynamicTableMeta extends DynamicTableDefinition {
  displayName: string;
  exposeFrontend: boolean;
}

export function listDynamicTables() {
  return adminApi
    .get<{ data: DynamicTableMeta[] }>("/cms/tables")
    .then((res) => res.data.data);
}

export function getDynamicTable(tableName: string) {
  return adminApi
    .get<{ data: DynamicTableMeta }>(`/cms/tables/${tableName}`)
    .then((res) => res.data.data);
}

export function addDynamicColumn(
  tableName: string,
  column: DynamicTableColumnInput,
) {
  return adminApi
    .post<{
      data: DynamicTableColumnSummary[];
    }>(`/cms/tables/${tableName}/columns`, { column })
    .then((res) => res.data.data);
}

export function dropDynamicColumn(tableName: string, columnName: string) {
  return adminApi
    .delete<{
      data: DynamicTableColumnSummary[];
    }>(`/cms/tables/${tableName}/columns`, { data: { columnName } })
    .then((res) => res.data.data);
}

export function updateDynamicTableSettings(
  tableName: string,
  payload: {
    displayName?: string;
    exposeFrontend?: boolean;
    headerBgColor?: string | null;
    headerTextColor?: string | null;
    bodyTextColor?: string | null;
  },
) {
  return adminApi
    .patch<{
      data: DynamicTableMeta;
    }>(`/cms/tables/${tableName}/settings`, payload)
    .then((res) => res.data.data);
}

export function insertDynamicRow(
  tableName: string,
  row: Record<string, unknown>,
) {
  return adminApi
    .post<{
      data: Record<string, unknown>;
    }>(`/cms/tables/${tableName}/rows`, { row })
    .then((res) => res.data.data);
}

export function fetchDynamicRows(tableName: string, limit = 200) {
  return adminApi
    .get<{
      data: {
        rows: Record<string, unknown>[];
        columns: DynamicTableColumnSummary[];
      };
    }>(`/cms/tables/${tableName}/rows`, { params: { limit } })
    .then((res) => res.data.data);
}

export function updateDynamicRow(
  tableName: string,
  keys: Record<string, unknown>,
  changes: Record<string, unknown>,
) {
  return adminApi
    .patch<{
      data: Record<string, unknown>;
    }>(`/cms/tables/${tableName}/rows`, { keys, changes })
    .then((res) => res.data.data);
}

export function deleteDynamicRow(
  tableName: string,
  keys: Record<string, unknown>,
) {
  return adminApi.delete<{ data: Record<string, unknown> }>(
    `/cms/tables/${tableName}/rows`,
    { data: { keys } },
  );
}

export interface CmsUploadResponse {
  url: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

export function uploadCmsFile(file: File) {
  const data = new FormData();
  data.append("file", file);
  // Let the browser set multipart/form-data boundary.
  return adminApi.post<{ data: CmsUploadResponse }>("/cms/uploads", data);
}

// ---- Success Stories (year-wise uploads) ----

export interface SuccessStory {
  id: number;
  year: number;
  imageUrl: string;
  altText: string | null;
  uploadedBy: number | null;
  createdAt: string;
}

export function listSuccessStories(year?: number) {
  return adminApi
    .get<{ data: SuccessStory[] }>("/success-stories", {
      params: year ? { year } : undefined,
    })
    .then((res) => res.data.data);
}

export function listSuccessStoryYears() {
  return adminApi
    .get<{ data: number[] }>("/success-stories/years")
    .then((res) => res.data.data);
}

export function uploadSuccessStory(file: File, year: number, altText?: string) {
  const data = new FormData();
  data.append("file", file);
  data.append("year", String(year));
  if (altText) {
    data.append("altText", altText);
  }
  return adminApi
    .post<{ data: SuccessStory }>("/success-stories", data)
    .then((res) => res.data.data);
}

export function deleteSuccessStory(id: number) {
  return adminApi.delete(`/success-stories/${id}`);
}

export default adminApi;
