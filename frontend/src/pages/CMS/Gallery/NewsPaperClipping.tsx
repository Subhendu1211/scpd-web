import React from "react";
import CmsContent from "../../../components/common/CmsContent";
import { useCmsPage } from "../../../hooks/useCmsPage";
import GalleryLayout from "@pages/Media/GalleryLayout";
import MediaGallery from "../../../components/media/MediaGallery";

export default function NewsPaperClipping() {
  const state = useCmsPage("/media/newspaper-clipping");

  return (
    <GalleryLayout>
      <CmsContent {...state} />
      <MediaGallery category="newspaper" />
    </GalleryLayout>
  );
}
