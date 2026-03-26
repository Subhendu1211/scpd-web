import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import GrievanceLayout from "@pages/Grievances/GrivanceLayout";

export default function Faqs() {
  const state = useCmsPage("/grievances/faqs");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  return (
    <GrievanceLayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? <CmsTable table={table} showSerialNumber={false} /> : null}
      </CmsContent>
    </GrievanceLayout>
  );
}
