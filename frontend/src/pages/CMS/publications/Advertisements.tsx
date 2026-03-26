import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import PublicationLayout from "@pages/Publications/PublicationLayout";

export default function Advertisements() {
  const state = useCmsPage("/publications/advertisement");
  const { page } = state;
  const { table, loading, error } = useCmsTable(page?.dynamicTableName);

  return (
    <PublicationLayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? <CmsTable table={table} /> : null}
      </CmsContent>
    </PublicationLayout>
  );
}
