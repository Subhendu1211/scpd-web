import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CmsPage, fetchMenuTree, fetchPages, MenuItemPayload } from "../api";
import NewsTable from "../components/NewsTable";

const STATUS_COPY: Record<
  CmsPage["status"],
  { label: string; tone: string; description: string }
> = {
  draft: {
    label: "Draft",
    tone: "slate",
    description: "Still being written or not yet sent for review.",
  },
  department_review: {
    label: "Department Review",
    tone: "amber",
    description: "Waiting on section-level validation.",
  },
  editor_review: {
    label: "Editor Review",
    tone: "indigo",
    description: "Content is being refined before publishing approval.",
  },
  publishing_review: {
    label: "Publishing Review",
    tone: "sky",
    description: "Final checkpoint before going live.",
  },
  published: {
    label: "Published",
    tone: "emerald",
    description: "Already visible on the website.",
  },
};

function flattenMenu(
  items: MenuItemPayload[],
): Array<MenuItemPayload & { depth: number }> {
  const result: Array<MenuItemPayload & { depth: number }> = [];

  const walk = (nodes: MenuItemPayload[], depth = 0) => {
    nodes.forEach((node) => {
      result.push({ ...node, depth });
      if (node.children?.length) {
        walk(node.children, depth + 1);
      }
    });
  };

  walk(items);
  return result;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const Dashboard: React.FC = () => {
  const [menu, setMenu] = useState<MenuItemPayload[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [menuTree, pageList] = await Promise.all([
          fetchMenuTree(),
          fetchPages(),
        ]);

        if (!cancelled) {
          setMenu(menuTree);
          setPages(pageList);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Unable to load admin data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const flatMenu = useMemo(() => flattenMenu(menu), [menu]);

  const menuById = useMemo(() => {
    const map = new Map<number, MenuItemPayload>();
    flatMenu.forEach((item) => {
      if (typeof item.id === "number") {
        map.set(item.id, item);
      }
    });
    return map;
  }, [flatMenu]);

  const pageCounts = useMemo(() => {
    const counts: Record<CmsPage["status"], number> = {
      draft: 0,
      department_review: 0,
      editor_review: 0,
      publishing_review: 0,
      published: 0,
    };

    pages.forEach((page) => {
      counts[page.status] += 1;
    });

    return counts;
  }, [pages]);

  const publishedPages = pageCounts.published;
  const draftPages = useMemo(
    () => pages.filter((page) => page.status === "draft"),
    [pages],
  );
  const reviewPages = useMemo(
    () =>
      pages.filter(
        (page) =>
          page.status === "department_review" ||
          page.status === "editor_review" ||
          page.status === "publishing_review",
      ),
    [pages],
  );
  const pagesWithHero = useMemo(
    () => pages.filter((page) => !!page.heroImagePath).length,
    [pages],
  );
  const inactiveMenuItems = useMemo(
    () => flatMenu.filter((item) => item.isActive === false).length,
    [flatMenu],
  );
  const rootSections = useMemo(
    () =>
      menu.map((item) => ({
        ...item,
        childCount: item.children?.length ?? 0,
      })),
    [menu],
  );
  const recentlyTouched = useMemo(
    () =>
      [...pages]
        .filter((page) => !!page.updatedAt || !!page.publishedAt)
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.publishedAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.publishedAt || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 5),
    [pages],
  );

  const completionRate = flatMenu.length
    ? Math.round((publishedPages / flatMenu.length) * 100)
    : 0;

  return (
    <div className="admin-content dashboard-page">
      <header className="admin-page-header admin-header--premium animate-fade-in-up">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            Track navigation coverage, page workflow, and content momentum
            across the public website.
          </p>
        </div>
        <div className="admin-toolbar">
          <Link
            className="btn"
            to="/admin/pages"
            style={{ background: "#fff", color: "#1e3a8a", fontWeight: 700 }}
          >
            Open Pages
          </Link>
          <Link
            className="btn secondary"
            to="/admin/menu"
            style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
          >
            Navigation
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="dashboard-loading">Loading dashboard...</div>
      ) : null}
      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="admin-grid" aria-label="Dashboard metrics">
            <article
              className="admin-panel glass-panel dashboard-metric-card accent-blue animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              <span>Navigation coverage</span>
              <strong>{completionRate}%</strong>
              <p>
                {publishedPages} published page{publishedPages === 1 ? "" : "s"}{" "}
                across {flatMenu.length} menu item
                {flatMenu.length === 1 ? "" : "s"}.
              </p>
            </article>
            <article
              className="admin-panel glass-panel dashboard-metric-card accent-amber animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <span>In progress</span>
              <strong>{reviewPages.length}</strong>
              <p>Pages currently moving through review workflow.</p>
            </article>
            <article
              className="admin-panel glass-panel dashboard-metric-card accent-emerald animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <span>Published with hero</span>
              <strong>{pagesWithHero}</strong>
              <p>Pages already carrying a hero asset.</p>
            </article>
            <article
              className="admin-panel glass-panel dashboard-metric-card accent-slate animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <span>Hidden navigation</span>
              <strong>{inactiveMenuItems}</strong>
              <p>Menu items disabled from the public site.</p>
            </article>
          </section>

          <div className="admin-split">
            <section
              className="admin-panel glass-panel dashboard-workflow-panel animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="dashboard-section-header">
                <div>
                  <h2>Workflow snapshot</h2>
                  <p>
                    See where content is piling up before it delays publishing.
                  </p>
                </div>
                <Link className="dashboard-inline-link" to="/admin/pages">
                  Review pages
                </Link>
              </div>

              <div className="dashboard-status-grid">
                {(
                  Object.entries(STATUS_COPY) as Array<
                    [CmsPage["status"], (typeof STATUS_COPY)[CmsPage["status"]]]
                  >
                ).map(([status, copy]) => (
                  <article
                    key={status}
                    className={`dashboard-status-card tone-${copy.tone}`}
                  >
                    <div className="dashboard-status-top">
                      <span>{copy.label}</span>
                      <strong>{pageCounts[status]}</strong>
                    </div>
                    <p>{copy.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="admin-panel glass-panel dashboard-attention-panel animate-fade-in-up"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="dashboard-section-header">
                <div>
                  <h2>Needs attention</h2>
                  <p>
                    Quick shortcuts to unfinished or recently touched content.
                  </p>
                </div>
              </div>

              <div className="dashboard-attention-columns">
                <div className="dashboard-list-block">
                  <div className="dashboard-list-heading">
                    <h3>Draft pages</h3>
                    <span>{draftPages.length}</span>
                  </div>
                  {draftPages.length === 0 ? (
                    <p className="dashboard-empty-note">No drafts pending.</p>
                  ) : (
                    <ul className="dashboard-link-list">
                      {draftPages.slice(0, 5).map((page) => {
                        const menuItem = page.menuItemId
                          ? menuById.get(page.menuItemId)
                          : null;
                        const label =
                          page.title ||
                          page.menuLabel ||
                          menuItem?.label ||
                          "(Untitled page)";
                        const link = page.menuItemId
                          ? `/admin/pages?menuItemId=${page.menuItemId}`
                          : "/admin/pages";

                        return (
                          <li key={page.id ?? page.menuItemId ?? label}>
                            <Link to={link}>{label}</Link>
                            <span>{formatDate(page.updatedAt)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="dashboard-list-block">
                  <div className="dashboard-list-heading">
                    <h3>Recently updated</h3>
                    <span>{recentlyTouched.length}</span>
                  </div>
                  {recentlyTouched.length === 0 ? (
                    <p className="dashboard-empty-note">
                      No recent updates recorded.
                    </p>
                  ) : (
                    <ul className="dashboard-link-list">
                      {recentlyTouched.map((page) => {
                        const menuItem = page.menuItemId
                          ? menuById.get(page.menuItemId)
                          : null;
                        const label =
                          page.title ||
                          page.menuLabel ||
                          menuItem?.label ||
                          "(Untitled page)";
                        const link = page.menuItemId
                          ? `/admin/pages?menuItemId=${page.menuItemId}`
                          : "/admin/pages";

                        return (
                          <li
                            key={`${page.id ?? page.menuItemId ?? label}-recent`}
                          >
                            <Link to={link}>{label}</Link>
                            <span>
                              {formatDate(page.updatedAt || page.publishedAt)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <section
              className="admin-panel glass-panel dashboard-structure-panel animate-fade-in-up"
              style={{ animationDelay: "0.7s" }}
            >
              <div className="dashboard-section-header">
                <div>
                  <h2>Top-level structure</h2>
                  <p>
                    Primary menu sections and how much content hangs under each
                    one.
                  </p>
                </div>
                <Link className="dashboard-inline-link" to="/admin/menu">
                  Open navigation
                </Link>
              </div>

              {rootSections.length === 0 ? (
                <p className="dashboard-empty-note">
                  No navigation sections created yet.
                </p>
              ) : (
                <div className="dashboard-section-grid">
                  {rootSections.map((section) => (
                    <article
                      key={section.id}
                      className="dashboard-section-card"
                    >
                      <div className="dashboard-section-card-top">
                        <h3>{section.label}</h3>
                        <span
                          className={`menu-status ${section.isActive === false ? "muted" : "live"}`}
                        >
                          {section.isActive === false ? "Hidden" : "Live"}
                        </span>
                      </div>
                      <p>{section.path}</p>
                      <div className="dashboard-section-meta">
                        <span>{section.childCount} child links</span>
                        <span>Sort #{section.sortOrder ?? 0}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              className="admin-panel glass-panel dashboard-getting-started animate-fade-in-up"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="dashboard-section-header">
                <div>
                  <h2>Quick actions</h2>
                  <p>
                    Common tasks for keeping the site current and consistent.
                  </p>
                </div>
              </div>

              <div className="dashboard-action-list">
                <Link to="/admin/menu" className="dashboard-action-card">
                  <strong>Reshape navigation</strong>
                  <span>
                    Add sections, reorder links, or disable stale menu items.
                  </span>
                </Link>
                <Link to="/admin/pages" className="dashboard-action-card">
                  <strong>Edit page content</strong>
                  <span>
                    Continue drafts, move content through review, and publish
                    updates.
                  </span>
                </Link>
                <Link to="/admin/media" className="dashboard-action-card">
                  <strong>Refresh media</strong>
                  <span>
                    Upload hero banners, inline visuals, and reusable assets.
                  </span>
                </Link>
              </div>
            </section>
          </div>

          <NewsTable />
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
