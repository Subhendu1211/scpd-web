import React from "react";
import { useLocation } from "react-router-dom";
import CmsContent from "../components/common/CmsContent";
import CmsTable from "../components/common/CmsTable";
import { useCmsPage } from "../hooks/useCmsPage";
import { useCmsTable } from "../hooks/useCmsTable";
import NotFound from "./NotFound";
import AboutLayout from "./About/AboutLayout";

export default function CmsPage() {
  const location = useLocation();
  const state = useCmsPage();
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);
  const isAboutSection =
    location.pathname === "/about" || location.pathname.startsWith("/about/");

  // When the backend reports a 404 for the current path, render the normal site not-found page.
  if (!state.loading && !state.page && state.error === "Content not found") {
    return <NotFound />;
  }

  const content = (
    <CmsContent {...state}>
      {loading ? <p>Loading table...</p> : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error ? <CmsTable table={table} /> : null}
    </CmsContent>
  );

  if (isAboutSection) {
    return <AboutLayout>{content}</AboutLayout>;
  }

  return content;
}
