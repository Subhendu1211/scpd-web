import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchCmsPageByPath, CmsPageRecord } from "../services/cms";

interface CmsPageState {
  loading: boolean;
  error: string | null;
  page: CmsPageRecord | null;
}

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  let normalized = path;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.replace(/\/+$/, "");
  }
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return normalized || "/";
}

export function useCmsPage(pathOverride?: string): CmsPageState {
  const location = useLocation();
  const targetPath = normalizePath(pathOverride ?? location.pathname);
  const { i18n } = useTranslation();

  // Use i18n.language directly as the source of truth
  const currentLang = (i18n.language?.startsWith("or") ? "or" : "en") as "en" | "or";

  const [state, setState] = useState<CmsPageState>({ loading: true, error: null, page: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ loading: true, error: null, page: null });
      try {
        const page = await fetchCmsPageByPath(targetPath || "/", currentLang);
        if (cancelled) {
          return;
        }
        if (!page) {
          setState({ loading: false, error: "Content not found", page: null });
          return;
        }
        setState({ loading: false, error: null, page });
      } catch (error: any) {
        if (cancelled) {
          return;
        }
        const message = error?.response?.data?.error ?? "Unable to load content";
        setState({ loading: false, error: message, page: null });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [targetPath, currentLang]);

  return state;
}
