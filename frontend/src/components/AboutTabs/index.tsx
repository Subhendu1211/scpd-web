import React, { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { redirectToCaseManagementLogin } from "../../utils/externalNavigation";

type Row = { title: string; date?: string; href: string };

const data = {
  citizenService: [
    {
      title: "How to Register",
      date: "2025-01-01",
      href: "/grievances/how-to-register",
    },
    {
      title: "Online Complaint",
      date: "2025-01-01",
      href: "__CITIZEN_LOGIN__",
    },
    {
      title: "Case Status Check",
      date: "2025-01-01",
      href: "__CITIZEN_LOGIN__",
    },
  ],
  whatsNew: [
    {
      title: "Public notice: Accessibility audit schedule",
      date: "2025-10-24",
      href: "/notice-board",
    },
    {
      title: "Workshop on assistive technology – invites",
      date: "2025-10-12",
      href: "/events/workshops-awareness",
    },
    {
      title: "RPwD Act FAQs updated",
      date: "2025-09-30",
      href: "/grievances/faqs",
    },
  ],
  tenders: [
    {
      title: "RFP: Accessibility assessment services",
      date: "2025-10-05",
      href: "/resources/tenders",
    },
    {
      title: "Quotation: Braille materials printing",
      date: "2025-09-20",
      href: "/resources/tenders",
    },
  ],
  notifications: [
    {
      title: "Notification: Constitution of ICC",
      date: "2025-09-10",
      href: "/resources/icc",
    },
    {
      title: "Resolution: State Advisory Board meeting",
      date: "2025-08-28",
      href: "/resources/state-advisory-board",
    },
  ],
};

const tabs = [
  { key: "citizenService", label: "Citizen Service" },
  { key: "whatsNew", label: "What’s News" },
  { key: "tenders", label: "Tenders" },
  { key: "notifications", label: "Notifications" },
] as const;

export default function AboutTabs() {
  const [active, setActive] =
    useState<(typeof tabs)[number]["key"]>("citizenService");

  const tabIds = useRef(
    Object.fromEntries(tabs.map((t) => [t.key, `${useId()}-${t.key}`]))
  ).current;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((t) => t.key === active);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive(tabs[(idx + 1) % tabs.length].key);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive(tabs[(idx - 1 + tabs.length) % tabs.length].key);
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActive(tabs[0].key);
    }
    if (e.key === "End") {
      e.preventDefault();
      setActive(tabs[tabs.length - 1].key);
    }
  };

  const renderTable = (rows: Row[], caption: string) => (
    <div className="table-responsive">
      <table className="table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="col-sl">
              Sl. No.
            </th>
            <th scope="col">Title</th>
            <th scope="col" className="col-date">
              Date
            </th>
            <th scope="col" className="col-actions">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.title + r.date}>
              <td className="col-sl">{i + 1}</td>
              <td>
                {r.href === "__CITIZEN_LOGIN__" ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => redirectToCaseManagementLogin("CITIZEN")}
                  >
                    {r.title}
                  </button>
                ) : (
                  <Link to={r.href}>{r.title}</Link>
                )}
              </td>
              <td className="col-date">
                {new Date(r.date!).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="col-actions">
                {r.href === "__CITIZEN_LOGIN__" ? (
                  <button
                    type="button"
                    className="link"
                    aria-label={`View: ${r.title}`}
                    onClick={() => redirectToCaseManagementLogin("CITIZEN")}
                  >
                    View
                  </button>
                ) : (
                  <Link to={r.href} aria-label={`View: ${r.title}`}>
                    View
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="tabset" aria-labelledby="about-tabs-heading">
      <h2 id="about-tabs-heading" className="visually-hidden">
        About section tabs
      </h2>

      <div
        className="tablist"
        role="tablist"
        aria-label="About section tabs"
        onKeyDown={onKeyDown}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`${tabIds[t.key]}-tab`}
            aria-controls={tabIds[t.key]}
            aria-selected={active === t.key}
            tabIndex={active === t.key ? 0 : -1}
            // className="tab"
            className={`tab ${active === t.key ? "active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={tabIds[t.key]}
          aria-labelledby={`${tabIds[t.key]}-tab`}
          hidden={active !== t.key}
          className="panel"
        >
          {t.key === "citizenService" &&
            renderTable(data.citizenService, "Citizen Service")}

          {t.key === "whatsNew" && renderTable(data.whatsNew, "What’s New")}

          {t.key === "tenders" && renderTable(data.tenders, "Tenders")}

          {t.key === "notifications" &&
            renderTable(data.notifications, "Notifications")}
        </div>
      ))}
    </section>
  );
}
