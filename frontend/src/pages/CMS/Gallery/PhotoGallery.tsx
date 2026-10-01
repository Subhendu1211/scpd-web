import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import { useCmsPage } from "../../../hooks/useCmsPage";
import GalleryLayout from "@pages/Media/GalleryLayout";
import MediaGallery from "../../../components/media/MediaGallery";

export default function PhotoGallery() {
  const state = useCmsPage("/media/photo-gallery");

  return (
    <GalleryLayout>
      <CmsContent {...state} />
      <MediaGallery category="photo" />
    </GalleryLayout>
  );
}
