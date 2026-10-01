import SideLayout from "@components/sidebar/SideLayout";

const resouceMenu = [
  {
    label: "nav.resources.notifications",
    to: "https://ssepd.odisha.gov.in/en/notifications/notification",
  },
  { label: "nav.resources.tenders", to: "/resources/tenders" },
  { label: "nav.resources.related", to: "/resources/related-websites" },
  {
    label: "nav.resources.stateAdvisory",
    to: "/resources/state-advisory-board",
  },
  { label: "nav.resources.icc", to: "/resources/icc" },
  { label: "nav.resources.schemes", to: "https://ssepd.odisha.gov.in/en/schemes-programme/ssedp-schemes" },
];

export default function ResourceLayout({ children }) {
  return <SideLayout menuItems={resouceMenu}>{children}</SideLayout>;
}
