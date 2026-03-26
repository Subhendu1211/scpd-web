import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import { useCmsPage } from "../../../hooks/useCmsPage";
import GalleryLayout from "@pages/Media/GalleryLayout";
import MediaGallery from "../../../components/media/MediaGallery";

export default function VideoGallery() {
  const state = useCmsPage("/media/video-gallery");

  return (
    <GalleryLayout>
      <CmsContent {...state} />
      <MediaGallery category="video" />
    </GalleryLayout>
  );
}
