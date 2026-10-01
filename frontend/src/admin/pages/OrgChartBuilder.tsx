import React, { useEffect, useMemo, useState } from "react";
import {
  createOrgUnit,
  deleteOrgUnit,
  fetchOrgChart,
  OrgUnit,
  reorderOrgUnit,
  updateOrgUnit,
  uploadCmsFile,
} from "../api";

type EditState = {
  id?: number;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  photoUrl: string;
  sortOrder: number;
  parentId: number | null;
  isActive: boolean;
};

const emptyState: EditState = {
  name: "",
  title: "",
  department: "",
  email: "",
  phone: "",
  photoUrl: "",
  sortOrder: 0,
  parentId: null,
  isActive: true,
};

const OrgChartBuilder: React.FC = () => {
  const [tree, setTree] = useState<OrgUnit[]>([]);
  const [form, setForm] = useState<EditState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrgChart();
      setTree(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Unable to load organisation chart",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const flatten = useMemo(() => {
    const items: OrgUnit[] = [];
    const walk = (nodes: OrgUnit[]) => {
      nodes.forEach((node) => {
        items.push(node);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };
    walk(tree);
    return items;
  }, [tree]);

  const selectForEdit = (node: OrgUnit) => {
    setForm({
      id: node.id,
      name: node.name,
      title: node.title ?? "",
      department: node.department ?? "",
      email: node.email ?? "",
      phone: node.phone ?? "",
      photoUrl: node.photoUrl ?? "",
      sortOrder: node.sortOrder ?? 0,
      parentId: node.parentId ?? null,
      isActive: node.isActive,
    });
    setSuccess(null);
    setError(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const onChange = (field: keyof EditState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await uploadCmsFile(file);
      const url = res.data.data.url;
      onChange("photoUrl", url);
      setSuccess("Photo uploaded successfully");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to upload photo");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: form.name.trim(),
        title: form.title.trim() || null,
        department: form.department.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        photoUrl: form.photoUrl.trim() || null,
        parentId: form.parentId ?? null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (form.id) {
        await updateOrgUnit(form.id, payload);
        setSuccess("Organisation entry updated");
      } else {
        await createOrgUnit(payload);
        setSuccess("Organisation entry created");
        setForm(emptyState);
      }
      await loadTree();
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Unable to save organisation entry",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Delete this entry and its children?")) return;
    try {
      await deleteOrgUnit(id);
      if (form.id === id) {
        setForm(emptyState);
      }
      setSuccess("Deleted organisation entry");
      await loadTree();
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Unable to delete organisation entry",
      );
    }
  };

  const handleReorder = async (node: OrgUnit, direction: -1 | 1) => {
    try {
      const nextSort = (node.sortOrder ?? 0) + direction;
      await reorderOrgUnit(node.id, node.parentId ?? null, nextSort);
      await loadTree();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to reorder entry");
    }
  };

  const renderTree = (nodes: OrgUnit[], depth = 0) => (
    <div
      className="org-tree-container"
      style={{ display: "grid", gap: "10px", paddingLeft: depth > 0 ? 20 : 0 }}
    >
      {nodes.map((node) => (
        <React.Fragment key={node.id}>
          <div
            className={`org-card animate-fade-in-up ${form.id === node.id ? "active" : ""}`}
            style={{ animationDelay: `${depth * 0.1}s` }}
          >
            <div className="org-avatar">
              {node.photoUrl ? (
                <img
                  src={node.photoUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "inherit",
                    objectFit: "cover",
                  }}
                />
              ) : (
                getInitials(node.name)
              )}
            </div>
            <div
              className="org-info"
              onClick={() => selectForEdit(node)}
              style={{ cursor: "pointer" }}
            >
              <h4>{node.name}</h4>
              <p>{node.title || "No title"}</p>
            </div>
            <div
              className="org-actions"
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <span className="org-status-badge live">
                Order: {node.sortOrder}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleReorder(node, -1)}
                title="Move up"
                style={{ padding: "4px 8px", minWidth: 0 }}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleReorder(node, 1)}
                title="Move down"
                style={{ padding: "4px 8px", minWidth: 0 }}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDelete(node.id)}
                title="Delete"
                style={{ padding: "4px 8px", minWidth: 0, color: "#ef4444" }}
              >
                ✕
              </button>
            </div>
          </div>
          {node.children && node.children.length
            ? renderTree(node.children, depth + 1)
            : null}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="admin-content">
      <header className="admin-page-header admin-header--premium animate-fade-in-up">
        <div>
          <h1>Organisation Chart</h1>
          <p>
            Design a premium, hierarchical structure for the public-facing
            organisation directory.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setForm(emptyState)}
          style={{ background: "#fff", color: "#1e3a8a", fontWeight: 700 }}
        >
          New Entry
        </button>
      </header>

      {error ? (
        <div className="admin-error animate-fade-in-up" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="admin-success animate-fade-in-up">{success}</div>
      ) : null}

      <div className="admin-split">
        <section
          className="admin-panel glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="admin-panel-header" style={{ marginBottom: 20 }}>
            <h2>Hierarchy Tree</h2>
            <p>Interactive tree view of your organisation.</p>
          </div>
          {loading && !tree.length ? (
            <div className="admin-loading">Loading structure...</div>
          ) : (
            renderTree(tree)
          )}
        </section>

        <section
          className="admin-panel glass-panel animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="admin-panel-header" style={{ marginBottom: 20 }}>
            <h2>{form.id ? "Update Entry" : "Create New Profile"}</h2>
          </div>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gap: "8px" }}>
                <label
                  htmlFor="org-name"
                  style={{ fontWeight: 700, fontSize: "0.9rem" }}
                >
                  Full Name
                </label>
                <input
                  id="org-name"
                  value={form.name}
                  placeholder="e.g. Jane Doe"
                  onChange={(e) => onChange("name", e.target.value)}
                  required
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    htmlFor="org-title"
                    style={{ fontWeight: 700, fontSize: "0.9rem" }}
                  >
                    Job Title
                  </label>
                  <input
                    id="org-title"
                    value={form.title}
                    placeholder="e.g. Director"
                    onChange={(e) => onChange("title", e.target.value)}
                  />
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    htmlFor="org-department"
                    style={{ fontWeight: 700, fontSize: "0.9rem" }}
                  >
                    Department
                  </label>
                  <input
                    id="org-department"
                    value={form.department}
                    placeholder="e.g. Operations"
                    onChange={(e) => onChange("department", e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    htmlFor="org-email"
                    style={{ fontWeight: 700, fontSize: "0.9rem" }}
                  >
                    Contact Email
                  </label>
                  <input
                    id="org-email"
                    type="email"
                    value={form.email}
                    placeholder="jane@example.com"
                    onChange={(e) => onChange("email", e.target.value)}
                  />
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    htmlFor="org-phone"
                    style={{ fontWeight: 700, fontSize: "0.9rem" }}
                  >
                    Phone Number
                  </label>
                  <input
                    id="org-phone"
                    value={form.phone}
                    placeholder="+1 234 567 890"
                    onChange={(e) => onChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                <label
                  htmlFor="org-photo"
                  style={{ fontWeight: 700, fontSize: "0.9rem" }}
                >
                  Profile Image
                </label>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <div
                    className="org-avatar"
                    style={{
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                      background: "#f1f5f9",
                      border: "2px solid #fff",
                    }}
                  >
                    {form.photoUrl ? (
                      <img
                        src={form.photoUrl}
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "inherit",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#94a3b8" }}>?</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "grid", gap: "8px" }}>
                    <input
                      id="org-photo"
                      value={form.photoUrl}
                      onChange={(e) => onChange("photoUrl", e.target.value)}
                      placeholder="https://..."
                      style={{ marginBottom: 0 }}
                    />
                    <label
                      className="btn btn-secondary btn-sm"
                      style={{ cursor: "pointer", width: "fit-content" }}
                    >
                      {uploadingPhoto ? "Uploading..." : "Upload New Image"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr",
                  gap: "16px",
                }}
              >
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    htmlFor="org-parent"
                    style={{ fontWeight: 700, fontSize: "0.9rem" }}
                  >
                    Report To (Parent)
                  </label>
                  <select
                    id="org-parent"
                    value={form.parentId ?? ""}
                    onChange={(e) =>
                      onChange(
                        "parentId",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">None (Top Level)</option>
                    {flatten
                      .filter((node) => node.id !== form.id)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    htmlFor="org-sort"
                    style={{ fontWeight: 700, fontSize: "0.9rem" }}
                  >
                    Display Order
                  </label>
                  <input
                    id="org-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      onChange("sortOrder", Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <label
                className="admin-checkbox"
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange("isActive", e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>
                  Active - Show this person on the public site
                </span>
              </label>
            </div>

            <div
              className="admin-actions"
              style={{
                marginTop: 24,
                padding: "16px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="submit"
                className="btn btn-lg"
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1e40af)",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                }}
              >
                {form.id ? "Save Changes" : "Create Profile"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setForm(emptyState)}
                  disabled={loading}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default OrgChartBuilder;
