import SideLayout from "@components/sidebar/SideLayout";
import React from "react";

const aboutMenu = [
  { label: "nav.about.commission", to: "/about/about-commission" },
  { label: "nav.about.vision", to: "/about/vision-mission" },
  { label: "nav.about.departments", to: "/about/departments" },
  { label: "nav.about.function", to: "/about/function" },
  { label: "nav.about.orgchart", to: "/about/organisation-chart" },
  { label: "nav.about.former", to: "/about/former-state-commissioners" },
  { label: "nav.about.telephone", to: "/about/telephone-directory" },
  { label: "nav.about.activities", to: "/about/main-activities" },
];

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <SideLayout menuItems={aboutMenu}><div className="about-layout-body">{children}</div></SideLayout>;
}
