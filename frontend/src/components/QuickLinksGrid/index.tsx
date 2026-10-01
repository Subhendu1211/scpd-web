import React from "react";

const cards = [
  {
    to: "/acts",
    icon: "📜",
    title: "Acts/Policies/Rules",
    desc: "RPwD Act, rules, notifications",
  },
  {
    to: "/publications",
    icon: "📚",
    title: "Publications",
    desc: "Reports, circulars, advisories",
  },
  {
    to: "/resources",
    icon: "🧩",
    title: "Resources",
    desc: "Guidelines and tools",
  },
  {
    to: "/media",
    icon: "📰",
    title: "Gallery",
    desc: "Press releases and coverage",
  },
  {
    to: "/awards",
    icon: "🏅",
    title: "Awards",
    desc: "Schemes and recognitions",
  },
  {
    to: "/events",
    icon: "📅",
    title: "Events/Programmes",
    desc: "Workshops and events",
  },
  {
    to: "/register-complaint",
    icon: "📝",
    title: "Register Complaint",
    desc: "Submit a grievance",
  },
  {
    to: "/notice-board",
    icon: "📌",
    title: "Notice Board",
    desc: "Latest notices",
  },
  {
    to: "/social",
    icon: "🔗",
    title: "Social Media",
    desc: "Follow us online",
  },
  {
    to: "/e-library",
    icon: "💾",
    title: "E Library",
    desc: "Documents and forms",
  },
  {
    to: "/social",
    icon: "🔗",
    title: "UseFull Links",
    desc: "Follow us online",
  },
  { to: "/login", icon: "🔐", title: "Login", desc: "Role-based access" },
];

export default function QuickLinksGrid() {
  return (
    <section className="card">
      <div className="card-body">
        <div className="quick-links">
          {cards.map((c) => (
            <a
              key={c.to}
              className="ql"
              href={c.to}
              aria-label={`${c.title}. ${c.desc}`}
            >
              <div className="icon" aria-hidden="true">
                {c.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{c.title}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{c.desc}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 12 }}>View →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
