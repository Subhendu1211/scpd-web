import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import { useCmsPage } from "../../../hooks/useCmsPage";
import GalleryLayout from "@pages/Media/GalleryLayout";
import MediaGallery from "../../../components/media/MediaGallery";

export default function AudioClipping() {
  const state = useCmsPage("/media/audio-clipping");

  return (
    <GalleryLayout>
      <CmsContent {...state} />
      <MediaGallery category="audio" />
    </GalleryLayout>
  );
}
