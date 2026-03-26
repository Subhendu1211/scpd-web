import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import EventProgramCards from "../../../components/common/EventProgramCards";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import EventLayout from "@pages/Events/EventsLayout";

export default function SakhyamaAbility() {
  const state = useCmsPage("/events/sakhyama-ability-talk");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  return (
    <EventLayout>
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
          emptyText="No Sakhyama events currently listed."
          fallbackTitlePrefix="Sakhyama Event"
          galleryButtonLabel="View all event photos"
        />
      </CmsContent>
    </EventLayout>
  );
}

