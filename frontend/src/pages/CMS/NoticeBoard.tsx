import React from "react";
import CmsContent from "../../components/common/CmsContent";
import CmsTable from "../../components/common/CmsTable";
import { useCmsPage } from "../../hooks/useCmsPage";
import { useCmsTable } from "../../hooks/useCmsTable";
import ResourceLayout from "@pages/Resources/ResourceLayout";

export default function NoticeBoard() {
  const state = useCmsPage("/notice-board");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  return (
    <ResourceLayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? <CmsTable table={table} /> : null}
      </CmsContent>
    </ResourceLayout>
  );
}