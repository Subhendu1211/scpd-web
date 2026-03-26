import React from "react";
import { Link, useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
  "": "Home",
  about: "About Us",
  acts: "Acts",
  publications: "Publications",
  resources: "Resources",
  grievances: "Grievances",
  rti: "RTI",
  media: "Media",
  awards: "Awards",
  events: "Events",
  "notice-board": "Notice Board",
  "e-library": "E‑Library",
  contact: "Contact",
  login: "Login",
  "register-complaint": "Register Complaint",
  accessibility: "Accessibility Statement",
  sitemap: "Sitemap"
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  const crumbs = [{ to: "/", label: "Home" }, ...parts.map((p, i) => {
    const to = "/" + parts.slice(0, i + 1).join("/");
    return { to, label: LABELS[p] || decodeURIComponent(p) };
  })];

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <div className="container">
        <ol>
          {crumbs.map((c, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <li key={c.to} aria-current={isLast ? "page" : undefined}>
                {isLast ? <span>{c.label}</span> : <Link to={c.to}>{c.label}</Link>}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}