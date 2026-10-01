import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import RTILayout from "@pages/RTI/RTILayout";

export default function RTiInformation() {
  const state = useCmsPage("/rti/information-handbook");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  return (
    <RTILayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? <CmsTable table={table} /> : null}
      </CmsContent>
    </RTILayout>
  );
}
