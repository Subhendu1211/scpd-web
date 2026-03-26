import SideLayout from "@components/sidebar/SideLayout";

const contactMenu = [
  { label: "nav.contact.office", to: "/contact/office-contact" },
  { label: "nav.contact.dsso", to: "/contact/dsso-list" },
  { label: "nav.contact.gro", to: "/contact/gro-list" },
];

export default function ContactLayout({ children }) {
  return <SideLayout menuItems={contactMenu}>{children}</SideLayout>;
}
