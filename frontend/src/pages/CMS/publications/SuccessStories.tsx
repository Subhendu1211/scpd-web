import React, { useEffect, useMemo, useState } from "react";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import PublicationLayout from "@pages/Publications/PublicationLayout";
import EventCard from "../../../components/common/EventCard";

interface SuccessStory {
  id: number;
  year: number;
  imageUrl: string;
  altText: string | null;
  createdAt: string;
}

export default function SuccessStories() {
  const state = useCmsPage("/publications/success-stories");
  const { page } = state;
  const {
    table,
    loading: tableLoading,
    error: tableError,
  } = useCmsTable(page?.dynamicTableName);

  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStories = async () => {
      setStoriesLoading(true);
      try {
        const res = await fetch("/api/v1/success-stories");
        const json = await res.json();
        if (!cancelled) {
          setStories(json.data || []);
        }
      } catch {
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setStoriesLoading(false);
      }
    };

    fetchStories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group by year
  const groupedByYear = useMemo(() => {
    const groups: Record<number, SuccessStory[]> = {};
    stories.forEach((s) => {
      if (!groups[s.year]) groups[s.year] = [];
      groups[s.year].push(s);
    });
    return Object.entries(groups)
      .map(([year, items]) => ({ year: Number(year), items }))
      .sort((a, b) => b.year - a.year);
  }, [stories]);

  return (
    <PublicationLayout>
      <CmsContent {...state} showSummary={false}>
        {tableLoading ? <p>Loading table…</p> : null}
        {tableError ? (
          <p className="admin-error" role="alert">
            {tableError}
          </p>
        ) : null}
        {!tableLoading && !tableError ? <CmsTable table={table} /> : null}

        <div id="success-stories" />

        {storiesLoading ? (
          <p>Loading success stories…</p>
        ) : groupedByYear.length === 0 ? (
          null
        ) : (
          groupedByYear.map(({ year, items }) => (
            <div key={year} style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#0b3a8c",
                  borderBottom: "3px solid #0b3a8c",
                  paddingBottom: "0.4rem",
                  marginBottom: "1rem",
                }}
              >
                {year}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {items.map((story) => (
                  <EventCard
                    key={story.id}
                    title={story.altText || `Success Story ${story.year}`}
                    image={story.imageUrl}
                    date={new Date(story.createdAt).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CmsContent>
    </PublicationLayout>
  );
}
