import React from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Box } from "@mui/material";
import { MdClose } from "react-icons/md";
import type { TableResponse } from "../../hooks/useCmsTable";
import EventCard from "./EventCard";
import { extractEventPhotos } from "../../utils/eventMedia";

interface EventProgramCardsProps {
  table: TableResponse | null;
  loading: boolean;
  error: string | null;
  emptyText?: string;
  fallbackTitlePrefix?: string;
  galleryButtonLabel?: string;
  mediaHeight?: number;
  maxWidth?: number | string;
  minCardWidth?: number | string;
  cardMaxWidth?: number | string;
  align?: "left" | "center";
}

export default function EventProgramCards({
  table,
  loading,
  error,
  emptyText = "No events currently listed.",
  fallbackTitlePrefix = "Event",
  galleryButtonLabel = "View all event photos",
  mediaHeight = 220,
  maxWidth,
  minCardWidth,
  cardMaxWidth,
  align = "center",
}: EventProgramCardsProps) {
  const [lightbox, setLightbox] = React.useState<{
    title: string;
    photos: string[];
  } | null>(null);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = React.useState(0);
  const [descModal, setDescModal] = React.useState<{
    title: string;
    description: string;
  } | null>(null);

  const toCssSize = (value?: number | string) => {
    if (value === undefined || value === null) return undefined;
    return typeof value === "number" ? `${value}px` : value;
  };

  const events = React.useMemo(() => {
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    return rows.map((row: any, idx: number) => {
      const title = row.title || row.name || row.caption || `${fallbackTitlePrefix} ${idx + 1}`;
      const photoList = extractEventPhotos(row as Record<string, unknown>);
      const image = photoList[0] || "";
      const location = row.location || row.venue || "";
      const description =
        row.description ||
        row.summary ||
        row.details ||
        row.body ||
        "";
      const startDate = row.start_date || row.startDate || row.date || "";
      const endDate = row.end_date || row.endDate || "";
      const dateRange =
        startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate;
      const eventKey = String(row.id || `event-${idx}`);

      return {
        eventKey,
        title: String(title),
        image: String(image),
        photos: photoList,
        location: location ? String(location) : "",
        date: dateRange ? String(dateRange) : "",
        description: description ? String(description) : "",
      };
    });
  }, [table?.rows, fallbackTitlePrefix]);

  if (loading) return <p>Loading events...</p>;
  if (error) {
    return (
      <p className="admin-error" role="alert">
        {error}
      </p>
    );
  }

  if (!table || events.length === 0) {
    return (
      <p style={{ color: "#64748b", textAlign: "center", marginTop: "2rem" }}>
        {emptyText}
      </p>
    );
  }

  const columnMin = toCssSize(minCardWidth ?? 360) || "360px";
  const wrapperStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${columnMin}, 1fr))`,
    gap: "2rem",
    marginTop: "2rem",
    width: "100%",
    maxWidth: toCssSize(maxWidth) || "100%",
    marginLeft: align === "center" && maxWidth ? "auto" : undefined,
    marginRight: align === "center" && maxWidth ? "auto" : undefined,
    justifyItems: align === "left" ? "start" : "center",
  };

  const cardWrapperStyle = {
    width: "100%",
    justifySelf: align === "left" ? "start" : "center",
    maxWidth: cardMaxWidth ? toCssSize(cardMaxWidth) : undefined,
  };

  return (
    <div style={wrapperStyle}>
      {events.map((event) => {
        return (
          <div key={event.eventKey} style={cardWrapperStyle}>
            <EventCard
              title={event.title}
              image={event.image}
              mediaHeight={mediaHeight}
              galleryImages={event.photos}
              galleryButtonLabel={galleryButtonLabel}
              galleryExpanded={false}
              onGalleryButtonClick={() =>
                {
                  setActiveLightboxPhoto(0);
                  setLightbox({
                    title: event.title,
                    photos: event.photos,
                  });
                }
              }
              onReadMore={
                event.description
                  ? () =>
                      setDescModal({
                        title: event.title,
                        description: event.description,
                      })
                  : undefined
              }
              renderInlineGallery={false}
              date={event.date}
              location={event.location}
              description={event.description}
            />
          </div>
        );
      })}

      <Dialog
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        maxWidth="lg"
        fullWidth
      >
        {lightbox ? (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{lightbox.title}</span>
              <IconButton aria-label="Close" onClick={() => setLightbox(null)}>
                <MdClose />
              </IconButton>
            </DialogTitle>
            <DialogContent
              dividers
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                background: "#0b1a30",
              }}
            >
              {lightbox.photos.length > 0 ? (
                <Box
                  component="img"
                  src={lightbox.photos[activeLightboxPhoto]}
                  alt={`${lightbox.title} ${activeLightboxPhoto + 1}`}
                  sx={{
                    width: "100%",
                    maxHeight: { xs: "52vh", md: "64vh" },
                    objectFit: "contain",
                    borderRadius: 1.5,
                    background: "#0b1a30",
                  }}
                />
              ) : null}

              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: {
                    xs: "repeat(3, minmax(0, 1fr))",
                    sm: "repeat(4, minmax(0, 1fr))",
                    md: "repeat(6, minmax(0, 1fr))",
                  },
                }}
              >
                {lightbox.photos.map((url, idx) => {
                  const isActive = idx === activeLightboxPhoto;
                  return (
                    <Box
                      key={`${lightbox.title}-${idx}-${url}`}
                      component="button"
                      type="button"
                      onClick={() => setActiveLightboxPhoto(idx)}
                      sx={{
                        border: isActive ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 1,
                        padding: 0,
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "#0b1a30",
                        lineHeight: 0,
                      }}
                      aria-label={`View photo ${idx + 1} in large size`}
                      aria-pressed={isActive}
                    >
                      <Box
                        component="img"
                        src={url}
                        alt={`${lightbox.title} thumbnail ${idx + 1}`}
                        sx={{
                          width: "100%",
                          height: { xs: 72, sm: 86, md: 96 },
                          objectFit: "cover",
                          display: "block",
                          opacity: isActive ? 1 : 0.84,
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(descModal)} onClose={() => setDescModal(null)} maxWidth="sm" fullWidth>
        {descModal ? (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{descModal.title}</span>
              <IconButton aria-label="Close" onClick={() => setDescModal(null)}>
                <MdClose />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ color: "#111827", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {descModal.description}
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}

