import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import EventProgramCards from "../../../components/common/EventProgramCards";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import EventLayout from "@pages/Events/EventsLayout";

export default function DisabilityFrientlyCampaign() {
  const state = useCmsPage("/events/disability-friendly-campaign");
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
          emptyText="No disability friendly campaign events currently listed."
          fallbackTitlePrefix="Campaign Event"
          galleryButtonLabel="View all event photos"
          mediaHeight={200}
          maxWidth="1200px"
          minCardWidth={540}
          cardMaxWidth={520}
          align="left"
        />
      </CmsContent>
    </EventLayout>
  );
}

