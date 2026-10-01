import React from "react";
import AboutLayout from "@pages/About/AboutLayout";
import CmsContent from "@components/common/CmsContent";
import CmsTable from "@components/common/CmsTable";
import { useCmsPage } from "@hooks/useCmsPage";
import { useCmsTable } from "@hooks/useCmsTable";

export default function FormerCommision() {
  const state = useCmsPage("/about/former-state-commissioners");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName, 200);

  return (
    <AboutLayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? <CmsTable table={table} title="Former State Commissioners" /> : null}
      </CmsContent>
    </AboutLayout>
  );
}
