import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import ContactLayout from "@pages/Contact/ContactLayout";

export default function ListOfDistrict() {
  const state = useCmsPage("/contact/dsso-list");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  return (
    <ContactLayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? <CmsTable table={table} /> : null}
      </CmsContent>
    </ContactLayout>
  );
}
