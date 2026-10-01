import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import EventProgramCards from "../../../components/common/EventProgramCards";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import PublicationLayout from "@pages/Publications/PublicationLayout";

export default function MonthlyMagazines() {
  const state = useCmsPage("/publications/monthly-magazines");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  return (
    <PublicationLayout>
      <CmsContent
        {...state}
        imageMaxWidth="400px"
        bodyFontSize="17px"
        heroAlign="right"
        contentWithImageRow
      >
        <EventProgramCards
          table={table}
          loading={loading}
          error={error}
          emptyText="No magazines currently listed."
          fallbackTitlePrefix="Magazine"
          galleryButtonLabel="View all magazine images"
        />
      </CmsContent>
    </PublicationLayout>
  );
}
