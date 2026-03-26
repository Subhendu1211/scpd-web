import React from "react";
import { Link } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/acts", label: "Acts" },
  { to: "/publications", label: "Publications" },
  { to: "/resources", label: "Resources" },
  { to: "/grievances", label: "Grievances" },
  { to: "/rti", label: "RTI" },
  { to: "/media", label: "Media" },
  { to: "/awards", label: "Awards" },
  { to: "/events", label: "Events" },
  { to: "/notice-board", label: "Notice Board" },
  { to: "/e-library", label: "E‑Library" },
  { to: "/contact", label: "Contact" },
  { to: "/register-complaint", label: "Register Complaint" },
  { to: "/login", label: "Login" },
  { to: "/accessibility", label: "Accessibility Statement" }
];

export default function Sitemap() {
  return (
    <section className="container" style={{ padding: "16px 0", fontSize: "1.3rem", lineHeight: 1.65 }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "12px" }}>Sitemap</h1>
      <nav aria-label="Sitemap">
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} style={{ fontSize: "1.3rem" }}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}