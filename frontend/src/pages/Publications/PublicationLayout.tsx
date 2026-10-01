import SideLayout from "@components/sidebar/SideLayout";

const publicationMenu = [
  { label: "nav.publications.monthly", to: "/publications/monthly-magazines" },
  { label: "nav.publications.annual", to: "/publications/annual-reports" },
  { label: "nav.publications.success", to: "/publications/success-stories" },
  { label: "nav.publications.achievements", to: "/publications/achievements" },
  { label: "nav.publications.advertisement", to: "/publications/advertisement" },
];

export default function PublicationLayout({ children }) {
  return <SideLayout menuItems={publicationMenu}>{children}</SideLayout>;
}
