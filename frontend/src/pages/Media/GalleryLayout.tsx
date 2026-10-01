import SideLayout from "@components/sidebar/SideLayout";

const galleryMenu = [
  { label: "nav.gallery.photos", to: "/media/photo-gallery" },
  { label: "nav.gallery.videos", to: "/media/video-gallery" },
  { label: "nav.gallery.news", to: "/media/newspaper-clipping" },
  { label: "nav.gallery.audio", to: "/media/audio-clipping" },
];

export default function GalleryLayout({ children }) {
  return <SideLayout menuItems={galleryMenu}>{children}</SideLayout>;
}
