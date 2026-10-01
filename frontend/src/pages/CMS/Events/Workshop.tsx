import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import EventProgramCards from "../../../components/common/EventProgramCards";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import { extractEventPhotos } from "../../../utils/eventMedia";
import EventLayout from "@pages/Events/EventsLayout";

export default function Workshop() {
  const state = useCmsPage("/events/workshops-awareness");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);
  const [activeEventKey, setActiveEventKey] = React.useState<string | null>(null);

  const events = React.useMemo(() => {
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    return rows.map((row: any, idx: number) => {
      const title = row.title || row.name || row.caption || `Workshop ${idx + 1}`;
      const photoList = extractEventPhotos(row as Record<string, unknown>);
      const image = photoList[0] || "";
      const location = row.location || row.venue || "";
      const startDate = row.start_date || row.startDate || row.date || "";
      const endDate = row.end_date || row.endDate || "";
      const dateRange =
        startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate;
      const eventKey = String(row.id || `workshop-${idx}`);

      return {
        eventKey,
        title: String(title),
        image: String(image),
        photos: photoList,
        location: location ? String(location) : "",
        date: dateRange ? String(dateRange) : "",
      };
    });
  }, [table?.rows]);

  React.useEffect(() => {
    if (!activeEventKey) return;
    const exists = events.some((event) => event.eventKey === activeEventKey);
    if (!exists) {
      setActiveEventKey(null);
    }
  }, [activeEventKey, events]);

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
          emptyText="No workshops currently listed."
          fallbackTitlePrefix="Workshop"
          galleryButtonLabel="View all event photos"
        />
      </CmsContent>
    </EventLayout>
  );
}
