import React, { useEffect, useState } from "react";
import { AdminWhatsNewItem, createWhatsNew, deleteWhatsNew, listWhatsNew } from "../api";

interface FormRow {
  title: string;
  description: string;
  link: string;
  publishedAt: string;
}

const emptyRow: FormRow = { title: "", description: "", link: "", publishedAt: "" };

const WhatsNewManager: React.FC = () => {
  const [items, setItems] = useState<AdminWhatsNewItem[]>([]);
  const [rows, setRows] = useState<FormRow[]>([emptyRow]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWhatsNew();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to fetch What's New items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (idx: number, patch: Partial<FormRow>) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);

  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloads = rows
      .map((r) => ({
        title: r.title.trim(),
        description: r.description.trim() || null,
        link: r.link.trim() || null,
        publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null
      }))
      .filter((r) => r.title);

    if (!payloads.length) {
      setError("At least one title is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      for (const p of payloads) {
        await createWhatsNew(p);
      }
      setRows([emptyRow]);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to save What's New items");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteWhatsNew(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to delete item");
    }
  };

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>What's New</h1>
          <p>Manage short homepage updates, supporting descriptions, and optional links.</p>
        </div>
      </header>

      <section className="admin-panel">
      <form className="admin-form" onSubmit={handleSubmit}>
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="admin-form__row"
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.2fr 1fr 0.9fr 0.35fr",
              gap: 12,
              alignItems: "end"
            }}
          >
            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span>Title *</span>
              <input
                type="text"
                value={row.title}
                onChange={(e) => updateRow(idx, { title: e.target.value })}
                placeholder="Headline or short update"
                required
              />
            </label>

            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span>Description (optional)</span>
              <input
                type="text"
                value={row.description}
                onChange={(e) => updateRow(idx, { description: e.target.value })}
                placeholder="Short description"
              />
            </label>

            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span>Link (optional)</span>
              <input
                type="text"
                value={row.link}
                onChange={(e) => updateRow(idx, { link: e.target.value })}
                placeholder="https://example.com or /path"
              />
            </label>

            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span>Publish date/time</span>
              <input
                type="datetime-local"
                value={row.publishedAt}
                onChange={(e) => updateRow(idx, { publishedAt: e.target.value })}
              />
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="link" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button type="button" onClick={addRow} className="btn secondary">
            + Add another
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving..." : "Save all"}
          </button>
        </div>
      </form>

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="admin-table-wrapper" style={{ marginTop: 16 }}>
        {loading ? (
          <p>Loading…</p>
        ) : items.length === 0 ? (
          <p>No items yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Title</th>
                <th style={{ width: "35%" }}>Description</th>
                <th style={{ width: "20%" }}>Link</th>
                <th>Published</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.description || "—"}</td>
                  <td>{item.link ? <a href={item.link}>{item.link}</a> : "—"}</td>
                  <td>{fmt(item.publishedAt)}</td>
                  <td>
                    <button type="button" className="admin-link-button danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </section>
    </div>
  );
};

export default WhatsNewManager;
