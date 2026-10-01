import React from "react";
import MediaGallery from "../../components/media/MediaGallery";
import GalleryLayout from "@pages/Media/GalleryLayout";

export default function VideoGalleryPage() {
  return (
    <GalleryLayout>
      <section className="card">
        <div className="card-body">
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "10px",
              paddingBottom: "6px",
              borderBottom: "2px solid orange"
            }}
          >
            Video Gallery
          </h1>
          <p style={{ fontSize: "16px", color: "#555" }}>
            Watch recorded sessions and highlights from the Commission's initiatives.
          </p>
        </div>
      </section>

      <MediaGallery
        category="video"
        actionLabel="Play video"
        renderMedia={(item, displayName) => (
          <video
            src={item.url}
            title={displayName}
            controls
            preload="metadata"
            playsInline
            controlsList="nodownload"
          />
        )}
      />
    </GalleryLayout>
  );
}
