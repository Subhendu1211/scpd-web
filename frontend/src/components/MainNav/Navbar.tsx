import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { fetchCmsNavigation, CmsNavigationItem, fetchCmsPageByPath } from "../../services/cms";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { buildOrdersArchive } from "../../utils/ordersArchive";

export type NavChild = { key?: string; label: string; to: string; children?: NavChild[] };
export type NavItem = { key?: string; label: string; to: string; children?: NavChild[] };

export const STATIC_NAV_ITEMS: NavItem[] = [
  { key: "nav.home", label: "Home", to: "/" },
  {
    key: "nav.about.title",
    label: "About Us",
    to: "/about",
    children: [
      { key: "nav.about.commission", label: "About Commission", to: "/about/about-commission" },
      { key: "nav.about.vision", label: "Vision/Mission", to: "/about/vision-mission" },
      { key: "nav.about.departments", label: "The Departments", to: "/about/departments" },
      { key: "nav.about.function", label: "Function", to: "/about/function" },
      { key: "nav.about.orgchart", label: "Organisation Chart", to: "/about/organisation-chart" },
      { key: "nav.about.former", label: "Former State Commissioners", to: "/about/former-state-commissioners" },
      { key: "nav.about.telephone", label: "Telephone Directory", to: "/about/telephone-directory" },
      { key: "nav.about.activities", label: "Our Main Activities", to: "/about/main-activities" },
    ],
  },
  {
    key: "nav.acts.title",
    label: "Acts & Rules",
    to: "/acts",
    children: [
      { key: "nav.acts.disabilityActs", label: "Disability Acts", to: "/acts/disability-acts" },
      {
        key: "nav.acts.disabilityPolicies",
        label: "Disability Policies",
        to: "https://ssepd.odisha.gov.in/en/publication/ssedp-laws-policies-schemes",
      },
      { key: "nav.acts.disabilityRules", label: "Disability Rules", to: "/acts/disability-rules-regulations" },
      { key: "nav.acts.disabilityGuidelines", label: "Disability Guidelines", to: "/acts/disability-guidelines" },
      { key: "nav.acts.equalOpportunity", label: "Equal Opportunity Policy", to: "/acts/equal-opportunity-policy" },
      { key: "nav.acts.handbook", label: "Handbook Concerning – Persons With Disabilities (Supreme Court of India)", to: "/acts/handbook-supreme-court" },
    ],
  },
  {
    key: "nav.publications.title",
    label: "Publications",
    to: "/publications",
    children: [
      { key: "nav.publications.monthly", label: "Monthly Magazines", to: "/publications/monthly-magazines" },
      { key: "nav.publications.annual", label: "Annual Reports", to: "/publications/annual-reports" },
      { key: "nav.publications.success", label: "Success Stories", to: "/publications/success-stories" },
      { key: "nav.publications.achievements", label: "Achievements", to: "/publications/achievements" },
      { key: "nav.publications.advertisement", label: "Advertisement", to: "/publications/advertisement" },
    ],
  },
  {
    key: "nav.resources.title",
    label: "Resources",
    to: "/resources",
    children: [
      { key: "nav.resources.notifications", label: "Notifications/Resolutions/Circulars/O.M.", to: "https://ssepd.odisha.gov.in/en/notifications/notification" },
      { key: "nav.resources.tenders", label: "Tenders", to: "/resources/tenders" },
      { key: "nav.resources.related", label: "Related Websites", to: "/resources/related-websites" },
      { key: "nav.resources.stateAdvisory", label: "State Advisory Board on Disability", to: "/resources/state-advisory-board" },
      { key: "nav.resources.icc", label: "Internal Complain Committee (ICC)", to: "/resources/icc" },
      { key: "nav.resources.schemes", label: "Schemes & Programmes", to: "https://ssepd.odisha.gov.in/en/schemes-programme/ssedp-schemes" },
    ],
  },
  {
    key: "nav.grievances.title",
    label: "Grievances/Cases",
    to: "/grievances",
    children: [
      { key: "nav.grievances.howTo", label: "How to Register a Complaint", to: "/grievances/how-to-register" },
      { key: "nav.grievances.register", label: "Register a Complaint", to: "http://localhost:5173/login/citizen" },
      { key: "nav.grievances.orders", label: "Orders of SCPD", to: "/grievances/final-orders" },
      { key: "nav.grievances.interim", label: "Interim Orders of SCPD", to: "/grievances/interim-orders" },
      { key: "nav.grievances.causeList", label: "Cause List", to: "/grievances/cause-list" },
      { key: "nav.grievances.pendency", label: "Pendency Status", to: "/grievances/pendency-status" },
      { key: "nav.grievances.suoMoto", label: "Suo-moto Cases", to: "/grievances/suo-moto-cases" },
      { key: "nav.grievances.landmark", label: "Landmark Court Judgments", to: "/grievances/landmark-court-judgments" },
      { key: "nav.grievances.faqs", label: "FAQs", to: "/grievances/faqs" },
    ],
  },
  {
    key: "nav.rti.title",
    label: "RTI",
    to: "https://rtiodisha.gov.in/Departments/84",
    children: [
      { key: "nav.rti.acts", label: "RTI Acts/Rules", to: "/rti/acts-rules" },
      { key: "nav.rti.pio", label: "Public Information Officer", to: "/rti/public-information-officer" },
      { key: "nav.rti.firstAppellate", label: "First Appellate Authority", to: "/rti/first-appellate-authority" },
    ],
  },
  {
    key: "nav.gallery.title",
    label: "Gallery",
    to: "/media",
    children: [
      { key: "nav.gallery.photos", label: "Photo Gallery", to: "/media/photo-gallery" },
      { key: "nav.gallery.videos", label: "Video Gallery", to: "/media/video-gallery" },
      { key: "nav.gallery.news", label: "Newspaper Clipping", to: "/media/newspaper-clipping" },
      { key: "nav.gallery.audio", label: "Audio Clipping", to: "/media/audio-clipping" },
    ],
  },
  {
    // label: "Awards",
    // to: "/awards",
    // children: [
    //   { label: "National Awards", to: "/awards/national-awards" },
    //   { label: "State Awards", to: "/awards/state-awards" },
    // ],
    key: "nav.notice",
    label: "Notice Board",
    to: "/notice-board",
    // children: [
    //   { label: "National Awards", to: "/notice-board/national-awards" },
    //   { label: "State Awards", to: "/notice-board/state-awards" },
    // ],
  },
  {
    key: "nav.events.title",
    label: "Events/Programmes",
    to: "/events",
    children: [
      { key: "nav.events.workshops", label: "Workshops/Awareness programmes", to: "/events/workshops-awareness" },
      { key: "nav.events.camp", label: "Camp Courts", to: "/events/camp-courts" },
      { key: "nav.events.quiz", label: "Quiz Competitions", to: "/events/quiz-competitions" },
      { key: "nav.events.sakhyama", label: "Sakhyama – An Ability Talk", to: "/events/sakhyama-ability-talk" },
      { key: "nav.events.campaign", label: "Disability Friendly Campaign", to: "/events/disability-friendly-campaign" },
    ],
  },
  {
    key: "nav.contact.title",
    label: "Office contact",
    to: "/contact",
    children: [
      { key: "nav.contact.office", label: "Office contact", to: "/contact/office-contact" },
      { key: "nav.contact.dsso", label: "List of District Social Security Officers (DSSOs)", to: "/contact/dsso-list" },
      { key: "nav.contact.gro", label: "List of Grievance Redressal Officers (GROs)", to: "/contact/gro-list" },
    ],
  },
  // { label: "Register an Online Complaint", to: "/register-complaint" },
  // { label: "Notice Board", to: "/notice-board" },
  // {
  //   label: "E-Library",
  //   to: "/e-library",
  //   children: [
  //     { label: "Audio Library", to: "/e-library/audio" },
  //     { label: "Video Library", to: "/e-library/video" },
  //     { label: "E-Book Library", to: "/e-library/ebook" }
  //   ]
  // }
];

function normalizeTarget(path?: string | null, slug?: string): string {
  const trimmed = path?.trim();
  if (trimmed) {
    // If it's an absolute URL, return as-is (external link)
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
  if (slug) {
    return `/${slug}`;
  }
  return "/";
}

export function buildChildren(nodes?: CmsNavigationItem[]): NavChild[] | undefined {
  if (!nodes?.length) {
    return undefined;
  }

  return nodes.map((child) => ({
    label: child.label,
    to: normalizeTarget(child.path, child.slug),
    children: buildChildren(child.children),
  }));
}

export function injectGrievanceArchives(
  items: NavItem[],
  archives: {
    orders: ReturnType<typeof buildOrdersArchive>;
    interim: ReturnType<typeof buildOrdersArchive>;
    suoMoto: ReturnType<typeof buildOrdersArchive>;
  }
): NavItem[] {
  const { orders, interim, suoMoto } = archives;
  if (!orders.length && !interim.length && !suoMoto.length) {
    return items;
  }

  return items.map((item) => {
    if (item.key !== "nav.grievances.title") {
      return item;
    }

    return {
      ...item,
      children: item.children?.map((child) => {
        if (child.key === "nav.grievances.orders" && orders.length) {
          return {
            ...child,
            children: orders.map((yearNode) => ({
              label: yearNode.label,
              to: `/grievances/final-orders?year=${yearNode.year}`,
              children: yearNode.months.map((monthNode) => ({
                label: monthNode.label,
                to: `/grievances/final-orders?year=${yearNode.year}&month=${monthNode.month}`,
              })),
            })),
          };
        }

        if (child.key === "nav.grievances.interim" && interim.length) {
          return {
            ...child,
            children: interim.map((yearNode) => ({
              label: `Interim ${yearNode.label}`,
              to: `/grievances/interim-orders?year=${yearNode.year}`,
              children: yearNode.months.map((monthNode) => ({
                label: monthNode.label.replace(/Orders$/i, "Interim Orders"),
                to: `/grievances/interim-orders?year=${yearNode.year}&month=${monthNode.month}`,
              })),
            })),
          };
        }

        if (child.key === "nav.grievances.suoMoto" && suoMoto.length) {
          return {
            ...child,
            children: suoMoto.map((yearNode) => ({
              label: `Suo-Moto ${yearNode.label}`,
              to: `/grievances/suo-moto-cases?year=${yearNode.year}`,
              children: yearNode.months.map((monthNode) => ({
                label: monthNode.label.replace(/Orders$/i, "Suo-Moto Cases"),
                to: `/grievances/suo-moto-cases?year=${yearNode.year}&month=${monthNode.month}`,
              })),
            })),
          };
        }

        return child;
      }),
    };
  });
}

export function buildNavFromCms(nodes: CmsNavigationItem[]): NavItem[] {
  if (!nodes.length) {
    return [];
  }

  return nodes.map((node) => ({
    label: node.label,
    to: normalizeTarget(node.path, node.slug),
    children: buildChildren(node.children),
  }));
}

/**
 * Flattens the navigation tree into a single-level array of searchable items,
 * including only "child" pages (leaf nodes) and excluding parent container pages.
 * @param items The navigation items to flatten.
 * @returns A flat array of NavChild items that are actual pages.
 */
export function getSearchableNavItems(items: NavItem[]): NavChild[] {
  const searchableItems: NavChild[] = [];

  function recurse(nodes: NavChild[]) {
    for (const node of nodes) {
      // If the node has children, it's a parent category. We don't add it to the
      // searchable list, but we do process its children.
      if (node.children && node.children.length > 0) {
        recurse(node.children);
      } else {
        // If it has no children, it's a leaf node (a page), so we add it.
        searchableItems.push(node);
      }
    }
  }

  recurse(items);
  return searchableItems;
}

export default function MainNav() {
  const CITIZEN_LOGIN_URL = "http://localhost:5173/login/citizen";
  const EXTERNAL_NOTIFICATIONS_URL = "https://ssepd.odisha.gov.in/en/notifications/notification";
  const EXTERNAL_DISABILITY_POLICIES_URL =
    "https://ssepd.odisha.gov.in/en/publication/ssedp-laws-policies-schemes";
  const SAME_TAB_EXTERNAL_URLS = new Set<string>();
  const { t } = useTranslation();
  const [navItems, setNavItems] = useState<NavItem[]>(STATIC_NAV_ITEMS);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const topRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
  const submenuRefs = useRef<(HTMLAnchorElement | null)[][]>([]);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadNavigation() {
      try {
        const nodes = await fetchCmsNavigation();
        if (ignore) {
          return;
        }
        const fromCms = buildNavFromCms(nodes);
        if (fromCms.length) {
          // setNavItems(fromCms);
        }
      } catch (error) {
        console.warn("Unable to load CMS navigation", error);
      }
    }

    loadNavigation();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGrievanceArchives() {
      try {
        const [finalPage, interimPage, suoMotoPage] = await Promise.all([
          fetchCmsPageByPath("/grievances/final-orders"),
          fetchCmsPageByPath("/grievances/interim-orders"),
          fetchCmsPageByPath("/grievances/suo-moto-cases"),
        ]);

        const readArchive = async (tableName?: string | null) => {
          if (!tableName) {
            return [] as ReturnType<typeof buildOrdersArchive>;
          }
          const response = await api.get<{ data: { rows: Record<string, unknown>[]; columns: { name: string }[] } }>(
            `/cms/tables/${tableName}`,
            { params: { limit: 500 } }
          );
          const table = response.data.data;
          return buildOrdersArchive(table.rows || [], table.columns || []);
        };

        const [ordersArchive, interimArchive, suoMotoArchive] = await Promise.all([
          readArchive(finalPage?.dynamicTableName),
          readArchive(interimPage?.dynamicTableName),
          readArchive(suoMotoPage?.dynamicTableName),
        ]);

        if (!cancelled) {
          setNavItems((base) =>
            injectGrievanceArchives(base, {
              orders: ordersArchive,
              interim: interimArchive,
              suoMoto: suoMotoArchive,
            })
          );
        }
      } catch (error) {
        console.warn("Unable to build grievance archive navigation", error);
      }
    }

    loadGrievanceArchives();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update labels when language changes (HeaderBar dispatches cms-language-change)
  useEffect(() => {
    const translateChildren = (
      children: NavChild[] | undefined,
      tt: ReturnType<typeof i18n.getFixedT>
    ): NavChild[] | undefined => {
      if (!children?.length) {
        return children;
      }

      return children.map((child) => ({
        ...child,
        label: tt(child.key ?? child.label, { defaultValue: child.label }),
        children: translateChildren(child.children, tt),
      }));
    };

    const applyLanguage = (lang: string) => {
      // Use getFixedT to fetch translations for the requested language immediately
      const tt = i18n.getFixedT(lang);
      setNavItems((base) =>
        base.map((it) => {
          const key = it.key ?? it.label;
          return {
            ...it,
            label: tt(key, { defaultValue: it.label }),
            children: translateChildren(it.children, tt),
          };
        })
      );
    };

    // initial using current i18n language
    applyLanguage(i18n.language || (document.documentElement.lang === "or" ? "or" : "en"));

    const handler = (e: Event) => {
      const lang = (e as CustomEvent<string>).detail;
      applyLanguage(lang);
    };
    window.addEventListener("cms-language-change", handler as EventListener);

    // Also listen to i18next languageChanged event for robustness
    const lngHandler = (lng: string) => applyLanguage(lng);
    i18n.on("languageChanged", lngHandler);

    return () => {
      window.removeEventListener("cms-language-change", handler as EventListener);
      i18n.off("languageChanged", lngHandler);
    };
  }, [t]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpenIndex(null);
        setMobileOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenIndex(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    topRefs.current = [];
    submenuRefs.current = [];
    setOpenIndex(null);
    setMobileOpen(false);
  }, [navItems.length]);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const renderSubmenuItem = (
    entry: NavChild,
    topIndex: number,
    itemCount: number,
    subIndex: number,
    isOpen: boolean,
    isTopLevel: boolean
  ) => {
    const hasChildren = !!entry.children?.length;
    const isExternal = /^https?:\/\//i.test(entry.to);
    const isCitizenLoginTarget = /\/login\/citizen\/?$/i.test(entry.to);
    const isSameTabExternalTarget = isExternal && SAME_TAB_EXTERNAL_URLS.has(entry.to);
    const isNotificationsInternal = entry.to === "/resources/notifications-resolutions-circulars-om";

    const handleEntryClick = (event: React.MouseEvent<HTMLElement>) => {
      if (isCitizenLoginTarget) {
        event.preventDefault();
        window.location.assign(CITIZEN_LOGIN_URL);
        return;
      }

      if (isNotificationsInternal) {
        event.preventDefault();
        window.open(entry.to, "_blank", "noopener");
        onNavigate();
        return;
      }

      if (isSameTabExternalTarget) {
        event.preventDefault();
        window.location.assign(entry.to);
        return;
      }

      onNavigate();
    };

    const onNavigate = () => {
      setOpenIndex(null);
      setMobileOpen(false);
    };

    const onTopLevelKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (!isTopLevel) {
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        submenuRefs.current[topIndex]?.[(subIndex + 1) % itemCount]?.focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        submenuRefs.current[topIndex]?.[(subIndex - 1 + itemCount) % itemCount]?.focus();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenIndex(null);
        topRefs.current[topIndex]?.focus();
      }
    };

    return (
      <li
        key={`${entry.key ?? entry.label}-${topIndex}-${subIndex}`}
        role="none"
        className={`submenu-item ${hasChildren ? "has-children" : ""}`}
      >
        {isExternal ? (
          <a
            ref={(el) => {
              if (!isTopLevel) {
                return;
              }
              submenuRefs.current[topIndex] ??= [];
              submenuRefs.current[topIndex][subIndex] = el;
            }}
            href={entry.to}
            role="menuitem"
            tabIndex={isTopLevel ? (isOpen ? 0 : -1) : 0}
            target={isSameTabExternalTarget ? "_self" : "_blank"}
            rel="noopener noreferrer"
            onKeyDown={onTopLevelKeyDown}
            onClick={handleEntryClick}
            title={entry.label}
            className={hasChildren ? "has-children-link" : undefined}
          >
            {entry.label}
          </a>
        ) : (
          <NavLink
            ref={(el) => {
              if (!isTopLevel) {
                return;
              }
              submenuRefs.current[topIndex] ??= [];
              submenuRefs.current[topIndex][subIndex] = el;
            }}
            to={entry.to}
            role="menuitem"
            tabIndex={isTopLevel ? (isOpen ? 0 : -1) : 0}
            target={isNotificationsInternal ? "_blank" : undefined}
            onKeyDown={onTopLevelKeyDown}
            onClick={handleEntryClick}
            title={entry.label}
            className={hasChildren ? "has-children-link" : undefined}
          >
            {entry.label}
          </NavLink>
        )}

        {hasChildren ? (
          <ul className="submenu submenu-nested" role="menu" aria-label={`${entry.label} submenu`}>
            {entry.children!.map((child, nestedIndex) =>
              renderSubmenuItem(child, topIndex, itemCount, nestedIndex, isOpen, false)
            )}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div
      id="mainnav-section"
      className={`main-nav-wrap ${mobileOpen ? "is-open" : ""}`}
      role="navigation"
      aria-label="Primary"
      ref={rootRef}
    >
      {/* Mobile top bar (shown on small screens) */}
      <div className="container-fluid nav-bar">
        <button
          className="menu-toggle"
          aria-controls="primary-nav"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          Menu
        </button>
      </div>

      {/* Backdrop for mobile menu */}
      <button
        className="nav-backdrop"
        hidden={!mobileOpen}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        tabIndex={-1}
      />

      <div className="container-fluid">
        <ul
          id="primary-nav"
          className="main-nav"
          role="menubar"
          aria-label="Main menu"
        >
          {navItems.map((item, idx) => {
            const hasSub = !!item.children?.length;
            const isOpen = openIndex === idx;
            const isRti = item.key === "nav.rti.title";
            const isNoticeBoard = item.key === "nav.notice";
            const shouldNavigateAsParent = isRti || isNoticeBoard;
            const isNonNavigatingParent = hasSub && !shouldNavigateAsParent;
            const isExternal = /^https?:\/\//i.test(item.to);

            const onTopLevelKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpenIndex(idx);
                submenuRefs.current[idx]?.[0]?.focus();
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                topRefs.current[(idx + 1) % navItems.length]?.focus();
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                topRefs.current[(idx - 1 + navItems.length) % navItems.length]?.focus();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpenIndex(null);
              }
            };

            return (
              <li
                key={item.key ?? item.label}
                role="none"
                className={`nav-item ${isOpen ? "open" : ""}`}
                onMouseEnter={() => {
                  cancelClose();
                  if (hasSub) setOpenIndex(idx);
                }}
                onMouseLeave={() => {
                  cancelClose();
                  closeTimer.current = window.setTimeout(() => {
                    setOpenIndex((cur) => (cur === idx ? null : cur));
                  }, 150);
                }}
                onFocus={() => {
                  if (hasSub) setOpenIndex(idx);
                }}
                onBlur={(e) => {
                  const next = e.relatedTarget as Node | null;
                  if (!e.currentTarget.contains(next)) setOpenIndex(null);
                }}
              >
                {hasSub ? (
                  <>
                    {isNonNavigatingParent ? (
                      <button
                        ref={(el) => (topRefs.current[idx] = el)}
                        type="button"
                        role="menuitem"
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        className="nav-button"
                        onKeyDown={onTopLevelKeyDown}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenIndex(isOpen ? null : idx);
                        }}
                        title={item.label}
                      >
                        {item.label}
                      </button>
                    ) : isExternal ? (
                      <a
                        ref={(el) => (topRefs.current[idx] = el)}
                        href={item.to}
                        role="menuitem"
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        target="_blank"
                        rel="noopener noreferrer"
                        onKeyDown={onTopLevelKeyDown}
                        onClick={() => setMobileOpen(false)}
                        title={item.label}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <NavLink
                        ref={(el) => (topRefs.current[idx] = el)}
                        to={item.to}
                        role="menuitem"
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        className={({ isActive }) => (isActive ? "active" : undefined)}
                        onKeyDown={onTopLevelKeyDown}
                        onClick={() => setMobileOpen(false)}
                        title={item.label}
                      >
                        {item.label}
                      </NavLink>
                    )}

                    {!isNonNavigatingParent && (
                      <button
                        aria-controls={`submenu-${idx}`}
                        aria-expanded={isOpen}
                        className="nav-toggle"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenIndex(isOpen ? null : idx);
                        }}
                        title={isOpen ? "Close submenu" : "Open submenu"}
                      >
                        ▾
                      </button>
                    )}

                    <ul
                      id={`submenu-${idx}`}
                      className="submenu"
                      role="menu"
                      hidden={!isOpen}
                      aria-label={`${item.label} submenu`}
                    >
                      {item.children!.map((child, subIdx) =>
                        renderSubmenuItem(child, idx, item.children!.length, subIdx, isOpen, true)
                      )}
                    </ul>
                  </>
                ) : (
                  <NavLink
                    ref={(el) => (topRefs.current[idx] = el)}
                    to={item.to}
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive ? "active" : undefined
                    }
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        topRefs.current[(idx + 1) % navItems.length]?.focus();
                      }
                      if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        topRefs.current[
                          (idx - 1 + navItems.length) % navItems.length
                        ]?.focus();
                      }
                    }}
                    onClick={() => setMobileOpen(false)}
                    title={item.label}
                  >
                    {item.label}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
