import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  CmsPage,
  CmsPageStatus,
  fetchMenuTree,
  fetchPageByMenu,
  fetchPages,
  MenuItemPayload,
  upsertPage,
  listDynamicTables,
  DynamicTableMeta,
  uploadCmsFile,
  SuccessStory,
  listSuccessStories,
  listSuccessStoryYears,
  uploadSuccessStory,
  deleteSuccessStory,
  listMedia,
} from "../api";
import CmsContent from "@components/common/CmsContent";
import WysiwygEditor from "../components/WysiwygEditor";
import { markdownToHtml } from "../../utils/markdown";
import { useAdminAuth } from "../auth";
import { getAllowedCmsWorkflowStatuses } from "../rbac";
import { ORG_CHART_DYNAMIC_SOURCE } from "../../constants/cms";
import AboutLayout from "@pages/About/AboutLayout";

const FONT_FAMILY_OPTIONS = [
  "",
  "Georgia, serif",
  "Times New Roman, serif",
  "Merriweather, serif",
  "Inter, sans-serif",
  "Arial, sans-serif",
  "Roboto, sans-serif",
];

const COLOR_OPTIONS = [
  "",
  "#1b2f5b",
  "#0f172a",
  "#111827",
  "#1f2937",
  "#ffffff",
  "#f8fafc",
  "#fff7ed",
];

interface EditorState {
  menuItemId: number | null;
  standalone: boolean;
  customPath: string;
  customLabel: string;
  showInFooter: boolean;
  footerSection: "contact" | "policies" | "governance";
  footerLabel: string;
  footerOrder: number;
  title: string;
  summary: string;
  body: string;
  titleOr: string;
  summaryOr: string;
  bodyOr: string;
  heroImagePath: string;
  status: CmsPageStatus;
  publishedAt: string;
  showPublishDate: boolean;
  dynamicTableName: string;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  pageLayout: "default" | "narrow" | "wide" | "full";
  attachmentsPaths: string[];
  attachmentsCaptions: string[];
}

const initialState: EditorState = {
  menuItemId: null,
  standalone: false,
  customPath: "",
  customLabel: "",
  showInFooter: false,
  footerSection: "policies",
  footerLabel: "",
  footerOrder: 0,
  title: "",
  summary: "",
  body: "",
  titleOr: "",
  summaryOr: "",
  bodyOr: "",
  heroImagePath: "",
  status: "draft",
  publishedAt: "",
  showPublishDate: false,
  dynamicTableName: "",
  fontFamily: "",
  fontColor: "",
  backgroundColor: "",
  pageLayout: "default",
  attachmentsPaths: [],
  attachmentsCaptions: [],
};

const STATUS_LABELS: Record<CmsPageStatus, string> = {
  draft: "Draft",
  department_review: "Department Review",
  editor_review: "Editor Review",
  publishing_review: "Publishing Review",
  published: "Published",
};

const STANDALONE_MENU_VALUE = "__standalone__";

function readApiError(err: any, fallback: string) {
  const apiError = err?.response?.data;
  if (apiError?.error && typeof apiError.error === "string") {
    return apiError.error;
  }
  if (Array.isArray(apiError?.errors) && apiError.errors.length > 0) {
    const first = apiError.errors[0];
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg;
    }
  }
  return apiError?.message || err?.message || fallback;
}

function toEditorHtml(raw: string | null | undefined) {
  if (!raw) {
    return "";
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  return looksLikeHtml ? trimmed : markdownToHtml(trimmed);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const PagesManager: React.FC = () => {
  const { user } = useAdminAuth();
  const [menuTree, setMenuTree] = useState<MenuItemPayload[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [editor, setEditor] = useState<EditorState>(initialState);
  const [loadedStatus, setLoadedStatus] = useState<CmsPageStatus | null>(null);
  const [pageExists, setPageExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [languageTab, setLanguageTab] = useState<"en" | "or">("en");
  const [tables, setTables] = useState<DynamicTableMeta[]>([]);
  const [searchParams] = useSearchParams();
  const [appliedQuerySelection, setAppliedQuerySelection] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [heroUploadFile, setHeroUploadFile] = useState<File | null>(null);
  const [heroUploadPreviewUrl, setHeroUploadPreviewUrl] = useState<
    string | null
  >(null);
  const [heroAltText, setHeroAltText] = useState("");
  const [heroUploading, setHeroUploading] = useState(false);

  // --- Attachments state ---
  const [attachmentsUploadFiles, setAttachmentsUploadFiles] = useState<File[]>(
    [],
  );
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const attachmentsFileRef = useRef<HTMLInputElement | null>(null);

  // --- Success Stories state ---
  const [ssItems, setSsItems] = useState<SuccessStory[]>([]);
  const [ssYears, setSsYears] = useState<number[]>([]);
  const [ssFilterYear, setSsFilterYear] = useState<number | "all">("all");
  const [ssUploadFile, setSsUploadFile] = useState<File | null>(null);
  const [ssUploadPreview, setSsUploadPreview] = useState<string | null>(null);
  const [ssUploadYear, setSsUploadYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [ssAltText, setSsAltText] = useState("");
  const [ssUploading, setSsUploading] = useState(false);
  const ssFileRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tree, list, tbls] = await Promise.all([
        fetchMenuTree(),
        fetchPages(),
        listDynamicTables(),
      ]);
      setMenuTree(tree);
      setPages(list);
      setTables(tbls.filter((t) => t.exposeFrontend));
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to load CMS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (heroUploadPreviewUrl) {
        URL.revokeObjectURL(heroUploadPreviewUrl);
      }
    };
  }, [heroUploadPreviewUrl]);

  useEffect(() => {
    const targetId = searchParams.get("menuItemId");
    if (!targetId || appliedQuerySelection || !menuTree.length || !pages.length)
      return;
    const idNum = Number(targetId);
    if (Number.isNaN(idNum)) return;
    setAppliedQuerySelection(true);
    selectMenu(idNum);
  }, [searchParams, appliedQuerySelection, menuTree, pages]);

  const menuOptions = useMemo(() => {
    const items: { id: number; label: string; path: string }[] = [];
    const walk = (nodes: MenuItemPayload[], prefix = "") => {
      nodes.forEach((node) => {
        items.push({
          id: node.id!,
          label: `${prefix}${node.label}`,
          path: node.path || "",
        });
        if (node.children?.length) {
          walk(node.children, `${prefix}› `);
        }
      });
    };
    walk(menuTree);
    return items;
  }, [menuTree]);

  const selectedMenuPath = useMemo(() => {
    if (editor.standalone) {
      return editor.customPath.trim();
    }
    return (
      menuOptions.find((item) => item.id === editor.menuItemId)?.path || ""
    );
  }, [editor.customPath, editor.menuItemId, editor.standalone, menuOptions]);

  const supportsOrgChartSource =
    selectedMenuPath === "/about/organisation-chart";
  const isSuccessStoriesPage =
    selectedMenuPath === "/publications/success-stories";
  const isAboutRoutePreview = selectedMenuPath.startsWith("/about/");

  // --- Success Stories data loading ---
  const loadSuccessStories = useCallback(async () => {
    try {
      const [items, yearList] = await Promise.all([
        listSuccessStories(ssFilterYear === "all" ? undefined : ssFilterYear),
        listSuccessStoryYears(),
      ]);
      setSsItems(items);
      setSsYears(yearList);
    } catch {
      /* ignore */
    }
  }, [ssFilterYear]);

  useEffect(() => {
    if (isSuccessStoriesPage) {
      loadSuccessStories();
    }
  }, [isSuccessStoriesPage, loadSuccessStories]);

  const handleSsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (ssUploadPreview) URL.revokeObjectURL(ssUploadPreview);
    setSsUploadFile(file);
    setSsAltText(
      file.name
        .replace(/\.[^./]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim(),
    );
    setSsUploadPreview(URL.createObjectURL(file));
  };

  const resetSsUpload = () => {
    setSsUploadFile(null);
    setSsAltText("");
    setSsUploadPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (ssFileRef.current) ssFileRef.current.value = "";
  };

  const handleSsUpload = async () => {
    if (!ssUploadFile) {
      setError("Select an image first");
      return;
    }
    if (!ssUploadYear || ssUploadYear < 1900 || ssUploadYear > 2100) {
      setError("Enter a valid year");
      return;
    }
    setSsUploading(true);
    setError(null);
    try {
      await uploadSuccessStory(
        ssUploadFile,
        ssUploadYear,
        ssAltText.trim() || undefined,
      );
      setSuccess(`Image uploaded for year ${ssUploadYear}`);
      resetSsUpload();
      await loadSuccessStories();
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setSsUploading(false);
    }
  };

  const handleSsDelete = async (id: number) => {
    if (!window.confirm("Delete this image?")) return;
    setError(null);
    try {
      await deleteSuccessStory(id);
      setSuccess("Image deleted");
      await loadSuccessStories();
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to delete");
    }
  };

  const ssGrouped = useMemo(() => {
    const groups: Record<number, SuccessStory[]> = {};
    ssItems.forEach((s) => {
      if (!groups[s.year]) groups[s.year] = [];
      groups[s.year].push(s);
    });
    return Object.entries(groups)
      .map(([y, items]) => ({ year: Number(y), items }))
      .sort((a, b) => b.year - a.year);
  }, [ssItems]);

  const allowedStatusOptions = useMemo(() => {
    const fromStatus = pageExists ? loadedStatus : null;
    return getAllowedCmsWorkflowStatuses(user?.role ?? null, fromStatus);
  }, [user?.role, pageExists, loadedStatus]);

  useEffect(() => {
    if (
      allowedStatusOptions.length &&
      !allowedStatusOptions.includes(editor.status)
    ) {
      setEditor((prev) => ({ ...prev, status: allowedStatusOptions[0] }));
    }
  }, [allowedStatusOptions, editor.status]);

  const selectMenu = async (menuItemId: number) => {
    setEditor((prev) => ({ ...prev, menuItemId, standalone: false }));
    if (!menuItemId) {
      return;
    }
    try {
      const page = await fetchPageByMenu(menuItemId);
      if (page) {
        setLoadedStatus(page.status);
        setPageExists(true);
        const existsInActiveMenu = menuOptions.some((item) => item.id === menuItemId);
        setEditor({
          menuItemId,
          standalone: !existsInActiveMenu,
          customPath: page.menuPath ?? "",
          customLabel: page.menuLabel ?? "",
          showInFooter: Boolean(page.showInFooter),
          footerSection: (page.footerSection as EditorState["footerSection"]) || "policies",
          footerLabel: page.footerLabel ?? "",
          footerOrder: Number(page.footerOrder ?? 0),
          title: page.title ?? "",
          summary: page.summary ?? "",
          body: toEditorHtml(page.body),
          titleOr: page.titleOr ?? "",
          summaryOr: page.summaryOr ?? "",
          bodyOr: toEditorHtml(page.bodyOr),
          heroImagePath: page.heroImagePath ?? "",
          status: page.status,
          publishedAt: toDateTimeLocal(page.publishedAt),
          showPublishDate: Boolean(page.showPublishDate),
          dynamicTableName: page.dynamicTableName ?? "",
          fontFamily: page.fontFamily ?? "",
          fontColor: page.fontColor ?? "",
          backgroundColor: page.backgroundColor ?? "",
          pageLayout:
            (page.pageLayout as EditorState["pageLayout"]) || "default",
          attachmentsPaths: page.attachmentsPaths ?? [],
          attachmentsCaptions:
            page.attachmentsCaptions && page.attachmentsCaptions.length > 0
              ? page.attachmentsCaptions
              : new Array((page.attachmentsPaths ?? []).length).fill(""),
        });
      } else {
        setLoadedStatus(null);
        setPageExists(false);
        setEditor({
          ...initialState,
          menuItemId,
          standalone: false,
          dynamicTableName: "",
        });
      }
      setSuccess(null);
      setLanguageTab("en");
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to load page");
    }
  };

  const handleChange = (field: keyof EditorState, value: any) => {
    setEditor((prev) => ({ ...prev, [field]: value }));
  };

  const handleHeroFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG/JPG/WebP)");
      return;
    }

    if (heroUploadPreviewUrl) {
      URL.revokeObjectURL(heroUploadPreviewUrl);
    }

    const baseAlt = file.name
      .replace(/\.[^./]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();

    setHeroUploadFile(file);
    setHeroAltText(baseAlt || file.name);
    setHeroUploadPreviewUrl(URL.createObjectURL(file));
  };

  const resetHeroUpload = () => {
    setHeroUploadFile(null);
    setHeroAltText("");
    setHeroUploadPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

  const handleHeroUpload = async () => {
    if (!heroUploadFile) {
      setError("Please choose a photo to upload");
      return;
    }

    if (!editor.menuItemId && !editor.standalone) {
      setError("Select a menu page or choose standalone mode before uploading a hero image");
      return;
    }

    if (editor.standalone && !editor.customPath.trim()) {
      setError("Enter a custom path before uploading a hero image");
      return;
    }

    setHeroUploading(true);
    setError(null);
    try {
      const res = await uploadCmsFile(heroUploadFile);
      const url = res.data?.data?.url;
      if (!url) {
        throw new Error("Upload completed but no URL was returned");
      }

      handleChange("heroImagePath", url);

      // Persist immediately so the public site can read `heroImagePath` without requiring a separate Save click.
      const trimmedSummary = editor.summary.trim();
      const trimmedTitleOr = editor.titleOr.trim();
      const trimmedSummaryOr = editor.summaryOr.trim();
      const odiaBody = editor.bodyOr;
      const saved = await upsertPage({
        menuItemId: editor.standalone ? null : editor.menuItemId,
        customPath: editor.standalone ? editor.customPath : null,
        customLabel: editor.standalone ? editor.customLabel : null,
        showInFooter: editor.showInFooter,
        footerSection: editor.showInFooter ? editor.footerSection : null,
        footerLabel: editor.showInFooter ? editor.footerLabel : null,
        footerOrder: editor.showInFooter ? editor.footerOrder : 0,
        title: editor.title.trim(),
        summary: trimmedSummary || null,
        body: editor.body,
        titleOr: trimmedTitleOr ? trimmedTitleOr : null,
        summaryOr: trimmedSummaryOr ? trimmedSummaryOr : null,
        bodyOr: odiaBody && odiaBody.trim().length ? odiaBody : null,
        heroImagePath: url,
        status: editor.status,
        publishedAt: editor.publishedAt
          ? new Date(editor.publishedAt).toISOString()
          : null,
        dynamicTableName: editor.dynamicTableName || null,
        fontFamily: editor.fontFamily || null,
        fontColor: editor.fontColor || null,
        backgroundColor: editor.backgroundColor || null,
        pageLayout: editor.pageLayout || "default",
      });

      if (editor.standalone && saved.menuItemId) {
        setEditor((prev) => ({ ...prev, menuItemId: saved.menuItemId ?? null }));
      }

      setSuccess("Photo uploaded and saved to page");
      resetHeroUpload();
      await loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Upload failed, please try again",
      );
    } finally {
      setHeroUploading(false);
    }
  };

  const handleAttachmentsFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setError(null);
    const files = Array.from(event.target.files ?? []);
    const valid = files.filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf",
    );
    if (valid.length !== files.length) {
      setError("Only image or PDF files are allowed.");
    }
    setAttachmentsUploadFiles((prev) => [...prev, ...valid]);
    if (attachmentsFileRef.current) attachmentsFileRef.current.value = "";
  };

  const handleAttachmentsUpload = async () => {
    if (attachmentsUploadFiles.length === 0) {
      setError("Please choose at least one file to upload.");
      return;
    }
    if (!editor.menuItemId) {
      setError("Select a page before uploading attachments.");
      return;
    }
    setAttachmentsUploading(true);
    setError(null);
    try {
      const newUrls: string[] = [];
      for (const file of attachmentsUploadFiles) {
        const res = await uploadCmsFile(file);
        const url = res.data?.data?.url;
        if (url) newUrls.push(url);
      }
      if (newUrls.length > 0) {
        setEditor((prev) => ({
          ...prev,
          attachmentsPaths: [...prev.attachmentsPaths, ...newUrls],
          attachmentsCaptions: [
            ...prev.attachmentsCaptions,
            ...new Array(newUrls.length).fill(""),
          ],
        }));
        setSuccess(
          `${newUrls.length} file(s) uploaded. Click Save Page to persist.`,
        );
        setAttachmentsUploadFiles([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor.standalone && !editor.menuItemId) {
      setError("Select a menu item before saving");
      return;
    }

    if (editor.standalone && !editor.customPath.trim()) {
      setError("Enter a custom path for standalone/footer page");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let resolvedHeroImagePath = editor.heroImagePath.trim() || null;
      const selectedHeroUploadFile = heroUploadFile;

      if (selectedHeroUploadFile) {
        const uploadRes = await uploadCmsFile(selectedHeroUploadFile);
        const uploadedUrl = uploadRes.data?.data?.url;
        if (!uploadedUrl) {
          throw new Error("Upload completed but no URL was returned");
        }
        resolvedHeroImagePath = uploadedUrl;
      }

      const trimmedSummary = editor.summary.trim();
      const trimmedTitleOr = editor.titleOr.trim();
      const trimmedSummaryOr = editor.summaryOr.trim();
      const odiaBody = editor.bodyOr;
      const saved = await upsertPage({
        menuItemId: editor.standalone ? null : editor.menuItemId,
        customPath: editor.standalone ? editor.customPath : null,
        customLabel: editor.standalone ? editor.customLabel : null,
        showInFooter: editor.showInFooter,
        footerSection: editor.showInFooter ? editor.footerSection : null,
        footerLabel: editor.showInFooter ? editor.footerLabel : null,
        footerOrder: editor.showInFooter ? editor.footerOrder : 0,
        title: editor.title.trim(),
        summary: trimmedSummary || null,
        body: editor.body,
        titleOr: trimmedTitleOr ? trimmedTitleOr : null,
        summaryOr: trimmedSummaryOr ? trimmedSummaryOr : null,
        bodyOr: odiaBody && odiaBody.trim().length ? odiaBody : null,
        heroImagePath: resolvedHeroImagePath,
        status: editor.status,
        publishedAt: editor.publishedAt
          ? new Date(editor.publishedAt).toISOString()
          : null,
        showPublishDate: editor.showPublishDate,
        attachmentsPaths: editor.attachmentsPaths,
        attachmentsCaptions: editor.attachmentsCaptions,
        dynamicTableName: editor.dynamicTableName || null,
        fontFamily: editor.fontFamily || null,
        fontColor: editor.fontColor || null,
        backgroundColor: editor.backgroundColor || null,
        pageLayout: editor.pageLayout || "default",
      });

      if (editor.standalone && saved.menuItemId) {
        setEditor((prev) => ({ ...prev, menuItemId: saved.menuItemId ?? null }));
      }

      if (selectedHeroUploadFile && resolvedHeroImagePath) {
        handleChange("heroImagePath", resolvedHeroImagePath);
        resetHeroUpload();
      }
      setLoadedStatus(editor.status);
      setPageExists(true);
      setSuccess("Page saved");
      await loadData();
    } catch (err: any) {
      setError(readApiError(err, "Unable to save page"));
    } finally {
      setLoading(false);
    }
  };

  const uploadInlineBodyImage = useCallback(async (file: File) => {
    const uploadRes = await uploadCmsFile(file);
    const uploadedUrl = uploadRes.data?.data?.url;
    if (!uploadedUrl) {
      throw new Error("Upload completed but no URL was returned");
    }
    return uploadedUrl;
  }, []);

  const loadBodyImageLibrary = useCallback(async () => {
    const media = await listMedia();
    return media
      .filter((item) => String(item.mimeType || "").startsWith("image/"))
      .map((item) => ({
        id: item.id,
        url: item.url,
        altText: item.altText || null,
        originalName: item.originalName || null,
      }));
  }, []);

  const previewPage = () => {
    setShowPreview(true);
  };

  return (
    <div className="admin-content pages-manager-page">
      <header className="admin-page-header admin-header--premium animate-fade-in-up">
        <div>
          <h1>Pages Manager</h1>
          <p>
            Draft, polish, and publish high-end content for the public website
            navigation tree.
          </p>
        </div>
        <div className="admin-toolbar">
          <button
            type="button"
            className="btn"
            onClick={loadData}
            disabled={loading}
            style={{ background: "#fff", color: "#1e3a8a", fontWeight: 700 }}
          >
            {loading ? "Syncing..." : "Sync Content"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="admin-error animate-fade-in-up" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="admin-success animate-fade-in-up">{success}</div>
      ) : null}

      <section
        className="admin-panel glass-panel animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="admin-panel-header">
          <h2>Page Selection</h2>
          <p>Choose a route from the menu tree to edit its presentation.</p>
        </div>
        <div style={{ marginTop: "16px" }}>
          <select
            className="admin-select"
            value={editor.standalone ? STANDALONE_MENU_VALUE : editor.menuItemId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === STANDALONE_MENU_VALUE) {
                const fallbackStatus = allowedStatusOptions[0] || "draft";
                setEditor((prev) => ({
                  ...initialState,
                  standalone: true,
                  status: fallbackStatus,
                }));
                setLoadedStatus(null);
                setPageExists(false);
                setSuccess(null);
                return;
              }
              if (!value) {
                setEditor(initialState);
                setLoadedStatus(null);
                setPageExists(false);
                setSuccess(null);
                return;
              }
              selectMenu(Number(value));
            }}
            style={{ width: "100%", maxWidth: "480px" }}
          >
            <option value="">Select a menu item to begin…</option>
            <option value={STANDALONE_MENU_VALUE}>No Menu (Footer / Standalone Page)</option>
            {menuOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {editor.standalone ? (
          <div
            className="premium-tabs"
            style={{
              marginTop: "14px",
              display: "grid",
              gap: "10px",
              maxWidth: "640px",
            }}
          >
            <input
              className="admin-input"
              placeholder="Standalone path (example: /privacy or /footer/about-us)"
              value={editor.customPath}
              onChange={(e) => handleChange("customPath", e.target.value)}
            />
            <input
              className="admin-input"
              placeholder="Footer link label (optional)"
              value={editor.customLabel}
              onChange={(e) => handleChange("customLabel", e.target.value)}
            />
          </div>
        ) : null}
      </section>

      {editor.menuItemId || editor.standalone ? (
        <form
          className="admin-form glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
          onSubmit={handleSubmit}
        >
          <div className="admin-panel-header">
            <h2>Content Editor</h2>
            <p>
              Refine page details and metadata. Maintain both English and Odia
              versions for a complete experience.
            </p>
          </div>
          <div
            className="premium-tabs"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "2rem",
              background: "rgba(15, 23, 42, 0.05)",
              padding: "4px",
              borderRadius: "12px",
              width: "fit-content",
            }}
          >
            <button
              type="button"
              className={`tab-btn ${languageTab === "en" ? "active" : ""}`}
              onClick={() => setLanguageTab("en")}
              style={{
                padding: "8px 20px",
                borderRadius: "10px",
                border: "none",
                background: languageTab === "en" ? "#fff" : "transparent",
                color: languageTab === "en" ? "#1e40af" : "#64748b",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow:
                  languageTab === "en" ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              English
            </button>
            <button
              type="button"
              className={`tab-btn ${languageTab === "or" ? "active" : ""}`}
              onClick={() => setLanguageTab("or")}
              style={{
                padding: "8px 20px",
                borderRadius: "10px",
                border: "none",
                background: languageTab === "or" ? "#fff" : "transparent",
                color: languageTab === "or" ? "#1e40af" : "#64748b",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow:
                  languageTab === "or" ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
              }}
            >
              ଓଡ଼ିଆ
            </button>
          </div>

          {languageTab === "en" ? (
            <div className="animate-fade-in-up">
              <div className="admin-form-row">
                <label htmlFor="page-title-en">Title (English)</label>
                <input
                  id="page-title-en"
                  className="admin-input"
                  value={editor.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-row">
                <label htmlFor="page-summary-en">Summary (English)</label>
                <textarea
                  id="page-summary-en"
                  className="admin-textarea"
                  value={editor.summary}
                  onChange={(e) => handleChange("summary", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="admin-form-row">
                <label htmlFor="page-body-en">Body (English)</label>
                <WysiwygEditor
                  value={editor.body}
                  onChange={(html) => handleChange("body", html)}
                  onImageUpload={uploadInlineBodyImage}
                  onLoadImageLibrary={loadBodyImageLibrary}
                  placeholder="Enter page body content..."
                  required
                />
              </div>
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="admin-form-row">
                <label htmlFor="page-title-or">Title (ଓଡ଼ିଆ)</label>
                <input
                  id="page-title-or"
                  className="admin-input"
                  value={editor.titleOr}
                  onChange={(e) => handleChange("titleOr", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="admin-form-row">
                <label htmlFor="page-summary-or">Summary (ଓଡ଼ିଆ)</label>
                <textarea
                  id="page-summary-or"
                  className="admin-textarea"
                  value={editor.summaryOr}
                  onChange={(e) => handleChange("summaryOr", e.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </div>
              <div className="admin-form-row">
                <label htmlFor="page-body-or">Body (ଓଡ଼ିଆ)</label>
                <WysiwygEditor
                  value={editor.bodyOr}
                  onChange={(html) => handleChange("bodyOr", html)}
                  onImageUpload={uploadInlineBodyImage}
                  onLoadImageLibrary={loadBodyImageLibrary}
                  placeholder="Optional — enter Odia body content..."
                />
              </div>
            </div>
          )}
          <div
            className="admin-form-row glass-panel animate-fade-in-up"
            style={{ animationDelay: "0.3s", marginTop: "2rem" }}
          >
            <div className="admin-panel-header">
              <h3>Presentation & Media</h3>
              <p>
                Configure hero imagery, file attachments, and page-specific
                visual settings.
              </p>
            </div>

            <div className="admin-form-row" style={{ marginTop: "1rem" }}>
              <label htmlFor="page-hero">Hero Image URL</label>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <input
                  id="page-hero"
                  className="admin-input"
                  value={editor.heroImagePath}
                  onChange={(e) =>
                    handleChange("heroImagePath", e.target.value)
                  }
                  placeholder="https://..."
                />
              </div>

              <div
                className="premium-upload-zone"
                style={{
                  marginTop: "1rem",
                  padding: "20px",
                  border: "2px dashed rgba(30, 64, 175, 0.1)",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.4)",
                }}
              >
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroFileChange}
                    style={{ fontSize: "0.9rem" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <input
                      className="admin-input"
                      value={heroAltText}
                      onChange={(e) => setHeroAltText(e.target.value)}
                      placeholder="Alt text (describe photo)"
                      style={{ flex: "1 1 240px" }}
                    />
                    <button
                      type="button"
                      className="btn"
                      disabled={heroUploading}
                      onClick={handleHeroUpload}
                    >
                      {heroUploading ? "Uploading…" : "Upload Hero"}
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={heroUploading}
                      onClick={resetHeroUpload}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {heroUploadPreviewUrl || editor.heroImagePath ? (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "1rem",
                    overflowX: "auto",
                    paddingBottom: "10px",
                  }}
                >
                  {heroUploadPreviewUrl && (
                    <div className="preview-item">
                      <small
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "#64748b",
                        }}
                      >
                        New Upload Preview
                      </small>
                      <img
                        src={heroUploadPreviewUrl}
                        alt="Preview"
                        style={{
                          width: 140,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "2px solid #3b82f6",
                        }}
                      />
                    </div>
                  )}
                  {editor.heroImagePath && (
                    <div className="preview-item">
                      <small
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "#64748b",
                        }}
                      >
                        Current Active Image
                      </small>
                      <img
                        src={editor.heroImagePath}
                        alt="Current"
                        style={{
                          width: 140,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div
              className="admin-grid"
              style={{
                marginTop: "2rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div className="admin-field">
                <label htmlFor="page-font">Typography</label>
                <select
                  id="page-font"
                  className="admin-select"
                  value={editor.fontFamily}
                  onChange={(e) => handleChange("fontFamily", e.target.value)}
                >
                  {FONT_FAMILY_OPTIONS.map((val) => (
                    <option key={val || "default-font"} value={val}>
                      {val || "System Default"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="font-color">Text Contrast</label>
                <select
                  id="font-color"
                  className="admin-select"
                  value={editor.fontColor}
                  onChange={(e) => handleChange("fontColor", e.target.value)}
                >
                  {COLOR_OPTIONS.map((val) => (
                    <option key={val || "default-font-color"} value={val}>
                      {val || "Adaptive"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="bg-color">Canvas Color</label>
                <select
                  id="bg-color"
                  className="admin-select"
                  value={editor.backgroundColor}
                  onChange={(e) =>
                    handleChange("backgroundColor", e.target.value)
                  }
                >
                  {COLOR_OPTIONS.map((val) => (
                    <option key={val || "default-bg"} value={val}>
                      {val || "Transparent"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="page-layout">Viewport Width</label>
                <select
                  id="page-layout"
                  className="admin-select"
                  value={editor.pageLayout}
                  onChange={(e) =>
                    handleChange(
                      "pageLayout",
                      e.target.value as EditorState["pageLayout"],
                    )
                  }
                >
                  <option value="default">Optimized (Default)</option>
                  <option value="narrow">Reading Focus (Narrow)</option>
                  <option value="wide">Digital Canvas (Wide)</option>
                  <option value="full">Edge-to-Edge (Full)</option>
                </select>
              </div>
            </div>

            <div className="admin-form-row" style={{ marginTop: "1.5rem" }}>
              <label htmlFor="page-table">Data Source Integration</label>
              <select
                id="page-table"
                className="admin-select"
                value={editor.dynamicTableName}
                onChange={(e) =>
                  handleChange("dynamicTableName", e.target.value)
                }
              >
                <option value="">No dynamic data</option>
                {supportsOrgChartSource && (
                  <option value={ORG_CHART_DYNAMIC_SOURCE}>
                    Organisation Chart Structure
                  </option>
                )}
                {tables.map((tbl) => (
                  <option key={tbl.tableName} value={tbl.tableName}>
                    {tbl.displayName || tbl.tableName}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-row" style={{ marginTop: "1.5rem" }}>
              <label
                className="admin-checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "12px",
                  background: "rgba(30, 64, 175, 0.03)",
                  borderRadius: "10px",
                }}
              >
                <input
                  type="checkbox"
                  checked={editor.showInFooter}
                  onChange={(e) => handleChange("showInFooter", e.target.checked)}
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Show this page in footer
                </span>
              </label>
            </div>

            {editor.showInFooter ? (
              <div
                className="admin-grid"
                style={{
                  marginTop: "0.8rem",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div className="admin-field">
                  <label htmlFor="footer-section">Footer section</label>
                  <select
                    id="footer-section"
                    className="admin-select"
                    value={editor.footerSection}
                    onChange={(e) =>
                      handleChange(
                        "footerSection",
                        e.target.value as EditorState["footerSection"],
                      )
                    }
                  >
                    <option value="contact">Contact</option>
                    <option value="policies">Policies</option>
                    <option value="governance">Governance</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="footer-label">Footer label (optional)</label>
                  <input
                    id="footer-label"
                    className="admin-input"
                    value={editor.footerLabel}
                    onChange={(e) => handleChange("footerLabel", e.target.value)}
                    placeholder="Leave empty to use page title"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="footer-order">Footer order</label>
                  <input
                    id="footer-order"
                    type="number"
                    min={0}
                    max={9999}
                    className="admin-input"
                    value={editor.footerOrder}
                    onChange={(e) =>
                      handleChange(
                        "footerOrder",
                        Number.isFinite(Number(e.target.value))
                          ? Number(e.target.value)
                          : 0,
                      )
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            className="admin-panel glass-panel animate-fade-in-up"
            style={{ animationDelay: "0.4s", marginTop: "24px" }}
          >
            <div className="admin-panel-header">
              <h3>Publishing Controls</h3>
              <p>Manage visibility, timeline, and audit settings.</p>
            </div>

            <div
              className="admin-grid"
              style={{
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginTop: "1rem",
              }}
            >
              <div className="admin-field">
                <label htmlFor="page-status">Workflow Status</label>
                <select
                  id="page-status"
                  className="admin-select"
                  value={editor.status}
                  onChange={(e) =>
                    handleChange("status", e.target.value as CmsPageStatus)
                  }
                >
                  {allowedStatusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {STATUS_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="page-published">Scheduling Date</label>
                <input
                  id="page-published"
                  type="datetime-local"
                  className="admin-input"
                  value={editor.publishedAt}
                  onChange={(e) => handleChange("publishedAt", e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-row" style={{ marginTop: "1rem" }}>
              <label
                className="admin-checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "12px",
                  background: "rgba(30, 64, 175, 0.03)",
                  borderRadius: "10px",
                }}
              >
                <input
                  type="checkbox"
                  checked={editor.showPublishDate}
                  onChange={(e) =>
                    handleChange("showPublishDate", e.target.checked)
                  }
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Publicly display publish & update stamps
                </span>
              </label>
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
                onClick={previewPage}
                disabled={loading}
                style={{ borderColor: "#1e3a8a", color: "#1e3a8a" }}
              >
                Interactive Preview
              </button>
              <button
                type="submit"
                className="btn"
                disabled={loading}
                style={{ padding: "12px 32px" }}
              >
                {loading ? "Saving Progress..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p>Select a menu item to start editing.</p>
      )}

      {/* ---- Success Stories: Year-wise image upload ---- */}
      {isSuccessStoriesPage ? (
        <section
          className="admin-panel glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.5s", marginTop: "1.5rem" }}
        >
          <div className="admin-panel-header">
            <h2>Success Stories Gallery</h2>
            <p>
              Curate year-wise visual narratives of accomplishments and
              milestones.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
              alignItems: "start",
              marginTop: "1.5rem",
            }}
          >
            <div
              className="premium-upload-zone"
              style={{
                padding: "20px",
                background: "rgba(30, 64, 175, 0.03)",
                borderRadius: "16px",
                border: "1px solid rgba(30, 64, 175, 0.08)",
              }}
            >
              <div className="admin-form-row">
                <label htmlFor="ss-year">Milestone Year</label>
                <select
                  id="ss-year"
                  className="admin-select"
                  value={ssUploadYear}
                  onChange={(e) => setSsUploadYear(Number(e.target.value))}
                >
                  {Array.from({ length: 16 }, (_, i) => 2015 + i)
                    .reverse()
                    .map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                </select>
              </div>
              <div className="admin-form-row">
                <label htmlFor="ss-img">Story Image</label>
                <input
                  id="ss-img"
                  ref={ssFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSsFileChange}
                />
              </div>
              <div className="admin-form-row">
                <label htmlFor="ss-alt">Visual Narrative (Alt Text)</label>
                <input
                  id="ss-alt"
                  type="text"
                  className="admin-input"
                  value={ssAltText}
                  onChange={(e) => setSsAltText(e.target.value)}
                  placeholder="Briefly describe this milestone..."
                />
              </div>
              <div
                style={{ display: "flex", gap: "10px", marginTop: "1.5rem" }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={handleSsUpload}
                  disabled={ssUploading || !ssUploadFile}
                >
                  {ssUploading ? "Publishing..." : "Publish Milestone"}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={resetSsUpload}
                  disabled={ssUploading}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="preview-container" style={{ position: "relative" }}>
              {ssUploadPreview ? (
                <div className="animate-fade-in-up">
                  <small
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    Curation Preview
                  </small>
                  <img
                    src={ssUploadPreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: 240,
                      objectFit: "cover",
                      borderRadius: "16px",
                      border: "4px solid #fff",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 260,
                    borderRadius: "16px",
                    background: "rgba(15, 23, 42, 0.02)",
                    border: "2px dashed rgba(15,23,42,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                  }}
                >
                  <span style={{ fontSize: "2rem", marginBottom: "10px" }}>
                    🖼️
                  </span>
                  <p style={{ fontSize: "0.9rem" }}>
                    Select an image to preview
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "3rem",
              padding: "12px 16px",
              background: "#fff",
              borderRadius: "12px",
              width: "fit-content",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <strong style={{ fontSize: "0.9rem", color: "#1e3a8a" }}>
              Filter Timeline:
            </strong>
            <select
              className="admin-select"
              value={ssFilterYear === "all" ? "all" : String(ssFilterYear)}
              onChange={(e) =>
                setSsFilterYear(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              style={{ minWidth: 140, border: "none", fontWeight: 600 }}
            >
              <option value="all">Full History</option>
              {ssYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {ssGrouped.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                color: "#94a3b8",
              }}
            >
              <p>No success stories have been curated for this timeline yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "3rem", marginTop: "2rem" }}>
              {ssGrouped.map(({ year, items }) => (
                <div key={year} className="animate-fade-in-up">
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "#1e3a8a",
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span>{year}</span>
                    <hr
                      style={{
                        flex: 1,
                        border: "none",
                        borderBottom: "2px solid rgba(30, 64, 175, 0.08)",
                      }}
                    />
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: "1.5rem",
                    }}
                  >
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className="glass-panel"
                        style={{
                          padding: "8px",
                          borderRadius: "16px",
                          border: "1px solid rgba(255,255,255,0.7)",
                          transition: "transform 0.3s",
                          cursor: "default",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            height: 160,
                            borderRadius: "10px",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={s.imageUrl}
                            alt={s.altText || `Story ${s.year}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                              opacity: 0,
                              transition: "opacity 0.3s",
                            }}
                            className="hover-overlay"
                          />
                        </div>
                        <div style={{ padding: "12px 6px" }}>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "#475569",
                              fontWeight: 500,
                              marginBottom: "12px",
                              height: "auto",
                            }}
                          >
                            {s.altText || "Untitled Milestone"}
                          </p>
                          <button
                            type="button"
                            className="btn secondary danger"
                            style={{
                              width: "100%",
                              padding: "6px",
                              fontSize: "0.75rem",
                              background: "rgba(239, 68, 68, 0.04)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.1)",
                            }}
                            onClick={() => handleSsDelete(s.id)}
                          >
                            Delete Entry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {pages.length ? (
        <section
          className="admin-panel glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.6s", marginTop: "24px" }}
        >
          <div className="admin-panel-header">
            <h2>Recent Content Updates</h2>
            <p>
              Chronological overview of the latest drafting and publishing
              activities.
            </p>
          </div>
          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table className="admin-table premium-table">
              <thead>
                <tr>
                  <th>Route / Menu Label</th>
                  <th>Status</th>
                  <th>Last Sync Time</th>
                </tr>
              </thead>
              <tbody>
                {pages.slice(0, 10).map((page) => (
                  <tr
                    key={`${page.menuItemId}-${page.updatedAt}`}
                    onClick={() => selectMenu(page.menuItemId)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 600, color: "#1e3a8a" }}>
                      {page.menuLabel ?? `ID: ${page.menuItemId}`}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${page.status}`}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          background:
                            page.status === "published"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(100, 116, 139, 0.1)",
                          color:
                            page.status === "published" ? "#16a34a" : "#475569",
                        }}
                      >
                        {STATUS_LABELS[page.status as CmsPageStatus] ??
                          page.status}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "0.85rem" }}>
                      {page.updatedAt
                        ? new Date(page.updatedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "3rem 1rem",
            zIndex: 1000,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              maxWidth: "1320px",
              width: "100%",
              padding: "1.5rem",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Preview</h3>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>
            </div>
            {isAboutRoutePreview ? (
              <AboutLayout>
                <CmsContent
                  loading={false}
                  error={null}
                  collapseSingleLineBreaks={selectedMenuPath === "/about/about-commission"}
                  page={{
                    id: editor.menuItemId ?? 0,
                    title: editor.title || null,
                    summary: editor.summary || null,
                    body: editor.body || "",
                    heroImagePath: editor.heroImagePath || null,
                    publishedAt: editor.publishedAt || null,
                    showPublishDate: editor.showPublishDate,
                    updatedAt: new Date().toISOString(),
                    label: "Preview",
                    slug: "preview",
                    path: "preview",
                    titleEn: editor.title || null,
                    summaryEn: editor.summary || null,
                    bodyEn: editor.body || "",
                    titleOr: editor.titleOr || null,
                    summaryOr: editor.summaryOr || null,
                    bodyOr: editor.bodyOr || null,
                    language: "en",
                    dynamicTableName: editor.dynamicTableName || null,
                    fontFamily: editor.fontFamily || null,
                    fontColor: editor.fontColor || null,
                    backgroundColor: editor.backgroundColor || null,
                    pageLayout: editor.pageLayout || "default",
                  }}
                />
              </AboutLayout>
            ) : (
              <CmsContent
                loading={false}
                error={null}
                page={{
                  id: editor.menuItemId ?? 0,
                  title: editor.title || null,
                  summary: editor.summary || null,
                  body: editor.body || "",
                  heroImagePath: editor.heroImagePath || null,
                  publishedAt: editor.publishedAt || null,
                  showPublishDate: editor.showPublishDate,
                  updatedAt: new Date().toISOString(),
                  label: "Preview",
                  slug: "preview",
                  path: "preview",
                  titleEn: editor.title || null,
                  summaryEn: editor.summary || null,
                  bodyEn: editor.body || "",
                  titleOr: editor.titleOr || null,
                  summaryOr: editor.summaryOr || null,
                  bodyOr: editor.bodyOr || null,
                  language: "en",
                  dynamicTableName: editor.dynamicTableName || null,
                  fontFamily: editor.fontFamily || null,
                  fontColor: editor.fontColor || null,
                  backgroundColor: editor.backgroundColor || null,
                  pageLayout: editor.pageLayout || "default",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PagesManager;
