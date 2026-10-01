import React, { useEffect, useState } from "react";
import {
  createNews,
  updateNews,
  deleteNews,
  listNews,
  AdminNewsItem,
} from "../api";

interface NewsFormData {
  id?: number;
  title: string;
  body: string;
  publishedAt: string;
  imageUrl?: string | null;
}

const emptyForm = (): NewsFormData => ({
  title: "",
  body: "",
  publishedAt: new Date().toISOString().slice(0, 16),
  imageUrl: null,
});

const NewsManager: React.FC = () => {
  const [items, setItems] = useState<AdminNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<NewsFormData>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNews();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to fetch news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (item: AdminNewsItem) => {
    setFormData({
      id: item.id,
      title: item.title,
      body: item.body || "",
      publishedAt: item.publishedAt
        ? new Date(item.publishedAt).toISOString().slice(0, 16)
        : "",
      imageUrl: item.imageUrl || null,
    });
    setImageFile(null);
    setRemoveImage(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClear = () => {
    setFormData(emptyForm());
    setImageFile(null);
    setRemoveImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim() || null,
        publishedAt: formData.publishedAt
          ? new Date(formData.publishedAt).toISOString()
          : null,
        image: imageFile,
        imageUrl: formData.imageUrl ?? null,
        removeImage,
      };

      if (formData.id) {
        await updateNews(formData.id, payload);
      } else {
        await createNews(payload);
      }

      handleClear();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to save news item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this news item?")) return;
    try {
      await deleteNews(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (formData.id === id) {
        handleClear();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to delete news");
    }
  };

  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "-";

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>News Marquee</h1>
          <p>
            Manage homepage announcements, scheduled headlines, and supporting
            body text.
          </p>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="admin-split">
        <section className="admin-panel">
          <div className="admin-card-header">
            <h2>{formData.id ? "Edit news item" : "Create news item"}</h2>
            {formData.id ? <span className="menu-status live">Editing</span> : null}
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>Headline title *</span>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Event success or public announcement"
                required
              />
            </label>

            <label className="admin-field">
              <span>Detailed body</span>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Write the announcement details here..."
                rows={7}
              />
              <small className="admin-field-help">
                Markdown is supported for body formatting.
              </small>
            </label>

            <label className="admin-field">
              <span>Image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  setImageFile(nextFile);
                  if (nextFile) {
                    setRemoveImage(false);
                  }
                }}
              />
              {imageFile ? (
                <small className="admin-field-help">Selected: {imageFile.name}</small>
              ) : null}
              {!imageFile && formData.imageUrl && !removeImage ? (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={formData.imageUrl}
                    alt="Current news"
                    style={{
                      width: 160,
                      height: 100,
                      objectFit: "cover",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                    }}
                  />
                </div>
              ) : null}
              {formData.imageUrl || imageFile ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setImageFile(null);
                      setFormData((prev) => ({ ...prev, imageUrl: null }));
                      setRemoveImage(true);
                    }}
                  >
                    Remove image
                  </button>
                </div>
              ) : null}
            </label>

            <label className="admin-field" style={{ maxWidth: 320 }}>
              <span>Publish date/time</span>
              <input
                type="datetime-local"
                value={formData.publishedAt}
                onChange={(e) =>
                  setFormData({ ...formData, publishedAt: e.target.value })
                }
              />
            </label>

            <div className="admin-form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving
                  ? "Saving..."
                  : formData.id
                    ? "Update news item"
                    : "Create news item"}
              </button>
              {formData.id ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn secondary"
                  disabled={saving}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="admin-panel">
          <div className="admin-card-header">
            <h2>Published queue</h2>
            <span className="menu-chip subtle">{items.length} items</span>
          </div>

          <div className="admin-table-wrapper">
            {loading ? (
              <p>Loading...</p>
            ) : items.length === 0 ? (
              <p>No news items yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Image</th>
                    <th style={{ width: "45%" }}>Title</th>
                    <th>Published</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{
                              width: 88,
                              height: 56,
                              objectFit: "cover",
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                            }}
                          />
                        ) : (
                          <span className="admin-row-subtle">No image</span>
                        )}
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        {item.body ? (
                          <div className="admin-row-subtle">
                            {item.body.substring(0, 80)}
                            {item.body.length > 80 ? "..." : ""}
                          </div>
                        ) : null}
                      </td>
                      <td>{fmt(item.publishedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-link-button"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-link-button danger"
                          onClick={() => handleDelete(item.id)}
                        >
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
    </div>
  );
};

export default NewsManager;
