import React from "react";
import MediaGallery from "../../components/media/MediaGallery";
import GalleryLayout from "@pages/Media/GalleryLayout";

export default function NewspaperClippingPage() {
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
            Newspaper Clippings
          </h1>
          <p style={{ fontSize: "16px", color: "#555" }}>
            Explore published coverage and press mentions featuring the Commission's work.
          </p>
        </div>
      </section>

      <MediaGallery category="newspaper" actionLabel="Open clipping" />
    </GalleryLayout>
  );
}
