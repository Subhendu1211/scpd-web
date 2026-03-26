import React from "react";
import MediaGallery from "../../components/media/MediaGallery";
import GalleryLayout from "@pages/Media/GalleryLayout";

export default function PhotoGalleryPage() {
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
            Photo Gallery
          </h1>
          <p style={{ fontSize: "16px", color: "#555" }}>
            Browse the latest photographs curated by the Commission.
          </p>
        </div>
      </section>

      <MediaGallery category="photo" />
    </GalleryLayout>
  );
}
