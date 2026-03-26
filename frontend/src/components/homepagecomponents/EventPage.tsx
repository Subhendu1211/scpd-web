import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchCmsPageByPath } from "../../services/cms";
import { useCmsTable } from "../../hooks/useCmsTable";
import { extractEventPhotos } from "../../utils/eventMedia";

const DEFAULT_EVENTS_TABLE = "workshops_awareness_events";
const WORKSHOPS_EVENTS_PAGE = "/events/workshops-awareness";
const EVENTS_SCROLL_LIMIT = 880;

const FALLBACK_EVENTS = [
  {
    eventKey: "fallback-1",
    title: "State commissioner Odisha – Building an Inclusive Future for PwD",
    caption: "State commissioner Odisha – Building an Inclusive Future for PwD",
    date: "2nd Sep – 4th Sep 2025",
    location: "sahidNagar (IICC), Bhubaneswar",
    image: "/images/gallery1.jpg",
  },
  {
    eventKey: "fallback-2",
    title: "State commissioner Odisha - Building an Inclusive Future for PwD",
    caption: "State commissioner Odisha - Building an Inclusive Future for PwD",
    date: "11th Sep – 13th Sep 2024",
    location: "padarsani Padia, Bhubaneswar",
    image: "/images/gallery2.jpg",
  },
  {
    eventKey: "fallback-3",
    title: "State commissioner Odisha – Building an Inclusive Future for PwD",
    caption: "State commissioner Odisha – Building an Inclusive Future for PwD",
    date: "10th Sept 2024",
    location: "Janata Maidan, Bhubaneswar",
    image: "/images/gallery3.jpg",
  },
];

export default function EventsPage() {
  const { t } = useTranslation();
  const [tableName, setTableName] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const page = await fetchCmsPageByPath(WORKSHOPS_EVENTS_PAGE);
        if (cancelled) return;
        setTableName(page?.dynamicTableName || DEFAULT_EVENTS_TABLE);
      } catch {
        if (!cancelled) setTableName(DEFAULT_EVENTS_TABLE);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { table } = useCmsTable(tableName ?? undefined, 6);

  const events = (() => {
    if (!table?.rows?.length) return FALLBACK_EVENTS;

    const activeRows = table.rows.filter((row) => row.is_active !== false);

      return activeRows.slice(0, 6).map((row, idx) => {
        const caption =
        row.caption ||
        row.imageCaption ||
        row.altText ||
        row.alt ||
        row.title ||
        `Event ${idx + 1}`;

      const title =
        row.title ||
        row.name ||
        row.heading ||
        `Event ${idx + 1}`;

      const date =
        row.date ||
        row.eventDate ||
        row.period ||
        row.schedule ||
        "";

      const location =
        row.location ||
        row.venue ||
        row.place ||
        "";

      const photos = extractEventPhotos(row as Record<string, unknown>);
      const image = photos[0] || "/images/gallery1.jpg";
      const eventKey = row.id ? String(row.id) : `event-${idx}`;

      return {
        eventKey,
        title,
        caption,
        date,
        location,
        image,
      };
    });
  })();

  return (
    <div className="p-10 bg-[#000068]">
      
      {/* Title */}
      <h2 className="text-white text-2xl font-bold mb-6">
        {t("homepage.events")}
      </h2>

      {/* Events Grid */}
      <div
        className="overflow-y-auto pr-2"
        style={{ maxHeight: EVENTS_SCROLL_LIMIT }}
      >
        <div className="grid md:grid-cols-3 gap-8">
          {events.map((event) => (
            <Link
              to={WORKSHOPS_EVENTS_PAGE}
              key={event.eventKey}
              aria-label={`View event ${event.title}`}
              className="group bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Image */}
              <img
                src={event.image}
                alt={event.caption}
                className="w-full h-[280px] object-cover"
              />
              {/* Caption */}
              <div className="px-5 pt-4">
                <h3 className="font-bold text-lg">{event.caption}</h3>
              </div>

              {/* Date & Location */}
              <div className="px-5 pb-5 pt-3 mt-auto space-y-2 text-[#000068]">
                {/* Date */}
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{event.date}</span>
                </div>

                {/* Location */}
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243A8 8 0 1117.657 16.657z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{event.location}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
