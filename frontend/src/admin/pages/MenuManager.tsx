import React, { useEffect, useMemo, useState } from "react";
import {
  createMenu,
  deleteMenu,
  fetchMenuTree,
  MenuItemPayload,
  reorderMenu,
  updateMenu,
} from "../api";

interface EditState {
  id?: number;
  label: string;
  slug: string;
  path: string;
  description: string;
  imagePath: string;
  sortOrder: number;
  parentId: number | null;
  isActive: boolean;
}

interface FlatMenuItem extends MenuItemPayload {
  depth: number;
  description: string;
  sortOrder: number;
}

function createEmptyState(): EditState {
  return {
    label: "",
    slug: "",
    path: "/",
    description: "",
    imagePath: "",
    sortOrder: 0,
    parentId: null,
    isActive: true,
  };
}

function slugifyLabel(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildPath(parentPath: string | undefined, slug: string) {
  const trimmedSlug = slug.replace(/^\/+|\/+$/g, "");
  if (!trimmedSlug) {
    return parentPath || "/";
  }

  const base =
    parentPath && parentPath !== "/" ? parentPath.replace(/\/+$/g, "") : "";
  return `${base}/${trimmedSlug}`;
}

function countNodes(items: MenuItemPayload[]): number {
  return items.reduce(
    (total, item) => total + 1 + countNodes(item.children ?? []),
    0,
  );
}

const MenuManager: React.FC = () => {
  const [tree, setTree] = useState<MenuItemPayload[]>([]);
  const [form, setForm] = useState<EditState>(createEmptyState);
  const [treeLoading, setTreeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTree = async () => {
    setTreeLoading(true);
    setError(null);
    try {
      const data = await fetchMenuTree();
      setTree(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to fetch menu");
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    void loadTree();
  }, []);

  const flatten = useMemo(() => {
    const all: FlatMenuItem[] = [];

    const walk = (items: MenuItemPayload[], depth = 0) => {
      items.forEach((item) => {
        all.push({
          ...item,
          depth,
          description: item.description ?? "",
          sortOrder: item.sortOrder ?? 0,
        });
        if (item.children?.length) {
          walk(item.children, depth + 1);
        }
      });
    };

    walk(tree);
    return all;
  }, [tree]);

  const stats = useMemo(() => {
    const inactive = flatten.filter((item) => item.isActive === false).length;
    const nested = flatten.filter((item) => item.parentId !== null).length;
    const withImages = flatten.filter((item) => !!item.imagePath).length;
    const maxDepth = flatten.length
      ? Math.max(...flatten.map((item) => item.depth + 1))
      : 0;

    return {
      total: flatten.length,
      roots: tree.length,
      inactive,
      nested,
      withImages,
      maxDepth,
    };
  }, [flatten, tree]);

  const selectedItem = useMemo(
    () => flatten.find((item) => item.id === form.id) ?? null,
    [flatten, form.id],
  );

  const descendantIds = useMemo(() => {
    const ids = new Set<number>();
    if (!form.id) {
      return ids;
    }

    const collect = (items: MenuItemPayload[]) => {
      items.forEach((item) => {
        if (typeof item.id === "number") {
          ids.add(item.id);
        }
        if (item.children?.length) {
          collect(item.children);
        }
      });
    };

    const visit = (items: MenuItemPayload[]) => {
      items.forEach((item) => {
        if (item.id === form.id) {
          collect(item.children ?? []);
          return;
        }
        if (item.children?.length) {
          visit(item.children);
        }
      });
    };

    visit(tree);
    return ids;
  }, [form.id, tree]);

  const parentOptions = useMemo(
    () =>
      flatten.filter(
        (item) => item.id !== form.id && !descendantIds.has(item.id ?? -1),
      ),
    [descendantIds, flatten, form.id],
  );

  const selectedParent = useMemo(
    () => flatten.find((item) => item.id === form.parentId) ?? null,
    [flatten, form.parentId],
  );

  const filteredTree = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return tree;
    }

    const filterItems = (items: MenuItemPayload[]): MenuItemPayload[] =>
      items.flatMap((item) => {
        const nextChildren = filterItems(item.children ?? []);
        const matches =
          item.label.toLowerCase().includes(term) ||
          item.slug.toLowerCase().includes(term) ||
          item.path.toLowerCase().includes(term) ||
          (item.description ?? "").toLowerCase().includes(term);

        if (matches || nextChildren.length) {
          return [{ ...item, children: nextChildren }];
        }

        return [];
      });

    return filterItems(tree);
  }, [query, tree]);

  const filteredCount = useMemo(() => countNodes(filteredTree), [filteredTree]);

  const resetForm = () => {
    setForm(createEmptyState());
    setError(null);
    setSuccess(null);
  };

  const selectForEdit = (item: MenuItemPayload) => {
    setForm({
      id: item.id,
      label: item.label,
      slug: item.slug,
      path: item.path,
      description: item.description ?? "",
      imagePath: item.imagePath ?? "",
      sortOrder: item.sortOrder ?? 0,
      parentId: item.parentId ?? null,
      isActive: item.isActive ?? true,
    });
    setSuccess(null);
    setError(null);
  };

  const onChange = (
    field: keyof EditState,
    value: string | number | boolean | null,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateFromLabel = () => {
    const nextSlug = slugifyLabel(form.label);
    if (!nextSlug) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      slug: nextSlug,
      path: buildPath(selectedParent?.path, nextSlug),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        parentId: form.parentId,
        label: form.label.trim(),
        slug: form.slug.trim(),
        path: form.path.trim() || "/",
        description: form.description.trim() || null,
        imagePath: form.imagePath.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };

      if (form.id) {
        await updateMenu(form.id, payload);
        setSuccess("Menu item updated");
      } else {
        await createMenu(payload);
        setSuccess("Menu item created");
        setForm(createEmptyState());
      }

      await loadTree();
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) {
      return;
    }

    if (!window.confirm("Delete this menu item and any nested children?")) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteMenu(id);
      setSuccess("Menu item deleted");
      if (form.id === id) {
        setForm(createEmptyState());
      }
      await loadTree();
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to delete menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (item: MenuItemPayload, direction: -1 | 1) => {
    if (!item.id) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedSort = (item.sortOrder ?? 0) + direction;
      await reorderMenu(item.id, item.parentId ?? null, updatedSort);
      await loadTree();
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to reorder menu item");
    } finally {
      setSaving(false);
    }
  };

  const renderTree = (items: MenuItemPayload[], depth = 0) => (
    <ul className="menu-tree" role={depth === 0 ? "tree" : "group"}>
      {items.map((item) => (
        <li key={item.id} role="treeitem" aria-level={depth + 1}>
          <div className="menu-item-row">
            <button type="button" onClick={() => selectForEdit(item)}>
              {item.label}
              <span
                style={{ marginLeft: 8, color: "#64748b", fontSize: "0.85rem" }}
              >
                — {item.path}
              </span>
            </button>
            <div className="menu-item-actions">
              <span>Order: {item.sortOrder ?? 0}</span>
              <button
                type="button"
                onClick={() => handleReorder(item, -1)}
                aria-label="Move up"
                disabled={saving}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => handleReorder(item, 1)}
                aria-label="Move down"
                disabled={saving}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label="Delete"
                disabled={saving}
              >
                ✕
              </button>
            </div>
          </div>
          {item.children && item.children.length
            ? renderTree(item.children, depth + 1)
            : null}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="admin-content menu-manager-page">
      <header className="admin-page-header admin-header--premium animate-fade-in-up">
        <div>
          <h1>Navigation Builder</h1>
          <p>
            Shape the public menu structure, nested links, and publishing order.
          </p>
        </div>
        <div className="admin-toolbar">
          <button
            type="button"
            className="btn secondary"
            onClick={() => void loadTree()}
            disabled={treeLoading || saving}
            style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
          >
            {treeLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={resetForm}
            disabled={saving}
            style={{ background: "#fff", color: "#1e3a8a", fontWeight: 700 }}
          >
            New Item
          </button>
        </div>
      </header>

      <section className="admin-grid" aria-label="Navigation overview">
        <article
          className="admin-panel glass-panel menu-overview-card animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <span>Total items</span>
          <strong>{stats.total}</strong>
          <p>Published and nested entries.</p>
        </article>
        <article
          className="admin-panel glass-panel menu-overview-card animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <span>Top level</span>
          <strong>{stats.roots}</strong>
          <p>Primary navigation links.</p>
        </article>
        <article
          className="admin-panel glass-panel menu-overview-card animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span>Nested links</span>
          <strong>{stats.nested}</strong>
          <p>Sub-pages and grouped links.</p>
        </article>
        <article
          className="admin-panel glass-panel menu-overview-card animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <span>Hidden</span>
          <strong>{stats.inactive}</strong>
          <p>Waiting to be re-enabled.</p>
        </article>
      </section>

      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? <div className="admin-success">{success}</div> : null}

      <div className="admin-split">
        <section
          className="admin-panel glass-panel menu-tree-panel animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="menu-panel-header">
            <div>
              <h2>Menu tree</h2>
              <p>
                Search, inspect hierarchy, and reorder links without leaving the
                page.
              </p>
            </div>
            <div className="menu-tree-summary">
              <strong>{filteredCount}</strong>
              <span>{query ? "matching items" : "items in tree"}</span>
            </div>
          </div>

          <div className="menu-tree-toolbar">
            <label className="menu-search-field" htmlFor="menu-tree-search">
              <span>Search</span>
              <input
                id="menu-tree-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find by label, path, slug, or description"
              />
            </label>
            <div className="menu-tree-toolbar-note">
              <span>{stats.withImages} items include card imagery</span>
              {treeLoading && tree.length ? (
                <span>Refreshing tree...</span>
              ) : null}
            </div>
          </div>

          {treeLoading && !tree.length ? (
            <div className="menu-tree-empty">Loading navigation tree...</div>
          ) : filteredTree.length ? (
            renderTree(filteredTree)
          ) : (
            <div className="menu-tree-empty">
              {query
                ? "No menu items match the current search."
                : "No menu items exist yet. Create the first one from the editor panel."}
            </div>
          )}
        </section>

        <section
          className="admin-panel glass-panel menu-editor-panel animate-fade-in-up"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="menu-panel-header">
            <div>
              <h2>{form.id ? "Edit menu item" : "Create menu item"}</h2>
              <p>
                Define the label visitors see, the route it points to, and how
                it sits inside the menu hierarchy.
              </p>
            </div>
            <span className={`menu-status ${form.isActive ? "live" : "muted"}`}>
              {form.isActive ? "Visible" : "Hidden"}
            </span>
          </div>

          <div className="menu-editor-preview">
            <div>
              <span className="menu-preview-label">Route preview</span>
              <strong>{form.path || "/"}</strong>
            </div>
            <div>
              <span className="menu-preview-label">Parent section</span>
              <strong>{selectedParent?.label || "Top-level navigation"}</strong>
            </div>
            <div>
              <span className="menu-preview-label">Selection</span>
              <strong>{selectedItem?.label || "New menu item"}</strong>
            </div>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Item Details</h3>
              <button
                type="button"
                className="btn secondary"
                onClick={handleGenerateFromLabel}
                disabled={!form.label.trim()}
              >
                Generate from label
              </button>
            </div>

            <label htmlFor="menu-label">Label</label>
            <input
              id="menu-label"
              value={form.label}
              onChange={(event) => onChange("label", event.target.value)}
              placeholder="e.g. About Us"
              required
            />

            <label htmlFor="menu-slug">Slug</label>
            <input
              id="menu-slug"
              value={form.slug}
              onChange={(event) =>
                onChange("slug", event.target.value.toLowerCase())
              }
              pattern="[a-z0-9-]+"
              placeholder="e.g. about-us"
              required
            />

            <label htmlFor="menu-path">Path</label>
            <input
              id="menu-path"
              value={form.path}
              onChange={(event) => onChange("path", event.target.value)}
              placeholder="e.g. /about-us"
              required
            />

            <label htmlFor="menu-parent">Parent</label>
            <select
              id="menu-parent"
              value={form.parentId ?? ""}
              onChange={(event) =>
                onChange(
                  "parentId",
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
            >
              <option value="">None (top level)</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${"  ".repeat(item.depth)}${item.label}`}
                </option>
              ))}
            </select>

            <label htmlFor="menu-sort">Sort order</label>
            <input
              id="menu-sort"
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                onChange("sortOrder", Number(event.target.value))
              }
            />

            <label htmlFor="menu-description">Description</label>
            <textarea
              id="menu-description"
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
              rows={3}
              placeholder="Optional description"
            />

            <label htmlFor="menu-image-path">Image path (optional)</label>
            <input
              id="menu-image-path"
              value={form.imagePath}
              onChange={(event) => onChange("imagePath", event.target.value)}
              placeholder="e.g. /images/section.jpg"
            />

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => onChange("isActive", event.target.checked)}
              />
              Active on site
            </label>

            <div className="admin-form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {form.id ? "Update" : "Create"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Clear
              </button>
              {form.id ? (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => handleDelete(form.id)}
                  disabled={saving}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default MenuManager;
