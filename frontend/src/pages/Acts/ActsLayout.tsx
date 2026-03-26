import SideLayout from "@components/sidebar/SideLayout";

const actsMenu = [
  { label: "nav.acts.disabilityActs", to: "/acts/disability-acts" },
  {
    label: "nav.acts.disabilityPolicies",
    to: "https://ssepd.odisha.gov.in/en/publication/ssedp-laws-policies-schemes",
  },
  {
    label: "nav.acts.disabilityRules",
    to: "/acts/disability-rules-regulations",
  },
  { label: "nav.acts.disabilityGuidelines", to: "/acts/disability-guidelines" },
  { label: "nav.acts.equalOpportunity", to: "/acts/equal-opportunity-policy" },
  {
    label: "nav.acts.handbook",
    to: "/acts/handbook-supreme-court",
  },
];

export default function ActsLayout({ children }) {
  return <SideLayout menuItems={actsMenu}>{children}</SideLayout>;
}
