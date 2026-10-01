import SideLayout from "@components/sidebar/SideLayout";

const rtiMenu = [
  { label: "nav.rti.acts", to: "/rti/acts-rules" },
  {
    label: "nav.rti.pio",
    to: "/rti/public-information-officer",
  },
  {
    label: "nav.rti.firstAppellate",
    to: "/rti/first-appellate-authority",
  },
];

export default function RTILayout({ children }) {
  return <SideLayout menuItems={rtiMenu}>{children}</SideLayout>;
}
