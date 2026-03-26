import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { CmsMediaItem, fetchCmsMedia, MediaCategory } from "../../services/cms";
import { MdClose, MdFullscreen } from "react-icons/md";

// eslint-disable-next-line no-unused-vars
type MediaRenderer = (
  item: CmsMediaItem,
  displayName: string,
) => React.ReactNode;

interface MediaGalleryProps {
  category: MediaCategory;
  title?: string;
  description?: string;
  renderMedia?: MediaRenderer;
  actionLabel?: string;
}

function groupByMonth(items: CmsMediaItem[]) {
  return items.reduce<Record<string, CmsMediaItem[]>>((acc, item) => {
    const key = new Date(item.createdAt).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

interface GallerySection {
  key: string;
  title: string;
  description?: string | null;
  items: CmsMediaItem[];
}

function buildGallerySections(
  items: CmsMediaItem[],
  _category: MediaCategory,
): GallerySection[] {
  if (!items.length) {
    return [];
  }

  const albumGroups = new Map<
    number,
    {
      title: string;
      description?: string | null;
      sortOrder?: number | null;
      items: CmsMediaItem[];
    }
  >();
  const unassigned: CmsMediaItem[] = [];

  items.forEach((item) => {
    if (item.albumId) {
      const existing = albumGroups.get(item.albumId);
      if (!existing) {
        albumGroups.set(item.albumId, {
          title: item.albumName || "Album",
          description: item.albumDescription ?? null,
          sortOrder: item.albumSortOrder ?? Number.MAX_SAFE_INTEGER,
          items: [item],
        });
      } else {
        existing.items.push(item);
      }
    } else {
      unassigned.push(item);
    }
  });

  const albumSections: GallerySection[] = Array.from(albumGroups.entries())
    .map(([albumId, data]) => ({
      albumId,
      ...data,
    }))
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.title.localeCompare(b.title);
    })
    .map((entry) => ({
      key: `album-${entry.albumId}`,
      title: entry.title,
      description: entry.description,
      items: entry.items,
    }));

  if (unassigned.length) {
    const monthGroups = groupByMonth(unassigned);
    const monthKeys = Object.keys(monthGroups);

    // Sort month groups by date descending
    monthKeys.sort((a, b) => {
      // Keys are like "Month Year", e.g. "March 2026"
      return new Date(b).getTime() - new Date(a).getTime();
    });

    monthKeys.forEach((monthKey) => {
      albumSections.push({
        key: `unassigned-${monthKey}`,
        title: monthKey,
        description: null,
        items: monthGroups[monthKey],
      });
    });
  }

  return albumSections;
}

function formatBytes(bytes: number | string | null): string {
  if (bytes === null || bytes === undefined) {
    return "";
  }
  const numeric = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!numeric || Number.isNaN(numeric) || numeric <= 0) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = numeric;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${units[index]}`;
}

function defaultMediaRenderer(item: CmsMediaItem, displayName: string) {
  if (item.mimeType.startsWith("image/")) {
    return <img src={item.url} alt={displayName} loading="lazy" />;
  }
  if (item.mimeType.startsWith("video/")) {
    return (
      <video
        src={item.url}
        title={displayName}
        controls
        preload="metadata"
        playsInline
        muted
      />
    );
  }
  if (item.mimeType.startsWith("audio/")) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
          padding: "24px",
          background: "#f8fafc",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px" }}>🎵</div>
        <audio src={item.url} controls style={{ width: "100%" }} />
      </div>
    );
  }
  return (
    <div className="gallery-file">
      <div style={{ fontSize: "40px", marginBottom: "8px" }}>📄</div>
      {displayName}
    </div>
  );
}

const DEFAULT_ACTION_LABEL = "View Details";

interface LightboxProps {
  item: CmsMediaItem;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ item, onClose }) => {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const isImage = item.mimeType.startsWith("image/");
  const isVideo = item.mimeType.startsWith("video/");
  const isAudio = item.mimeType.startsWith("audio/");
  const displayName = item.altText || item.originalName || item.filename;

  return createPortal(
    <div className="lightbox-portal" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Close">
          <MdClose />
        </button>

        {isImage ? (
          <img src={item.url} alt={displayName} className="lightbox-media" />
        ) : isVideo ? (
          <video src={item.url} controls autoPlay className="lightbox-media" />
        ) : isAudio ? (
          <div
            className="lightbox-media"
            style={{
              background: "#fff",
              padding: "40px",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              🎵
            </div>
            <audio
              src={item.url}
              controls
              autoPlay
              style={{ width: "400px" }}
            />
          </div>
        ) : (
          <div
            className="lightbox-media"
            style={{
              background: "#fff",
              padding: "40px",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>📄</div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              Download File
            </a>
          </div>
        )}

        <div className="lightbox-info">
          <h3>{displayName}</h3>
          <p>{new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function MediaGallery({
  category,
  title,
  description,
  renderMedia,
  actionLabel,
}: MediaGalleryProps) {
  const [items, setItems] = useState<CmsMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CmsMediaItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCmsMedia(category);
        if (!cancelled) {
          setItems(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.response?.data?.error || "Unable to load media";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [category]);

  const sections = useMemo(
    () => buildGallerySections(items, category),
    [items, category],
  );

  const openLightbox = useCallback((item: CmsMediaItem) => {
    setSelectedItem(item);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const isPhotoGallery = category === "photo";

  return (
    <section className="card">
      <div className="card-body">
        {title || description ? (
          <header className="gallery-header">
            {title ? <h1>{title}</h1> : null}
            {description ? (
              <p className="gallery-description">{description}</p>
            ) : null}
          </header>
        ) : null}

        {loading ? <p>Loading media…</p> : null}
        {error ? (
          <div className="gallery-error" role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="gallery-empty">
            <p>No media has been published in this section yet.</p>
          </div>
        ) : null}

        {!loading && !error && sections.length > 0
          ? sections.map((section) => (
              <div key={section.key} className="gallery-month">
                <h2>{section.title}</h2>
                {section.description ? (
                  <p className="gallery-section-description">
                    {section.description}
                  </p>
                ) : null}
                <div
                  className={`gallery-grid${isPhotoGallery ? " is-photo" : ""}`}
                >
                  {section.items.map((item, index) => {
                    const displayName =
                      item.altText || item.originalName || item.filename;
                    const mediaContent = renderMedia
                      ? renderMedia(item, displayName)
                      : defaultMediaRenderer(item, displayName);

                    const isImage = item.mimeType.startsWith("image/");
                    const isVideo = item.mimeType.startsWith("video/");

                    // Keep cards uniform; no masonry variants
                    const extraClass = "";

                    return (
                      <figure
                        key={item.id}
                        className={`gallery-card${extraClass}`}
                        onClick={() => openLightbox(item)}
                      >
                        <div
                          className={`gallery-thumb${isVideo ? " has-video" : ""}${isImage ? " is-photo" : ""}`}
                        >
                          {mediaContent}
                        </div>
                        <figcaption>
                          <span className="gallery-link">
                            {isVideo ? <MdFullscreen /> : <MdFullscreen />}
                            {actionLabel || DEFAULT_ACTION_LABEL}
                          </span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            ))
          : null}
      </div>

      {selectedItem && <Lightbox item={selectedItem} onClose={closeLightbox} />}
    </section>
  );
}
