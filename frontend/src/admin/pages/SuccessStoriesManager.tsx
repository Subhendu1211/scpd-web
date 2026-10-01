import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  listSuccessStories,
  listSuccessStoryYears,
  uploadSuccessStory,
  deleteSuccessStory,
  SuccessStory,
} from "../api";

const currentYear = new Date().getFullYear();

const SuccessStoriesManager: React.FC = () => {
  const [items, setItems] = useState<SuccessStory[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterYear, setFilterYear] = useState<number | "all">("all");

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadYear, setUploadYear] = useState<number>(currentYear);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [storiesData, yearsData] = await Promise.all([
        listSuccessStories(filterYear === "all" ? undefined : filterYear),
        listSuccessStoryYears(),
      ]);
      setItems(storiesData);
      setYears(yearsData);
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to load success stories");
    } finally {
      setLoading(false);
    }
  }, [filterYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview);
      }
    };
  }, [uploadPreview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG/JPG/WebP)");
      return;
    }

    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
    }

    const baseAlt = file.name
      .replace(/\.[^./]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();

    setUploadFile(file);
    setAltText(baseAlt || file.name);
    setUploadPreview(URL.createObjectURL(file));
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setAltText("");
    setUploadPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setError("Please select an image to upload");
      return;
    }
    if (!uploadYear || uploadYear < 1900 || uploadYear > 2100) {
      setError("Please enter a valid year (1900–2100)");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      await uploadSuccessStory(
        uploadFile,
        uploadYear,
        altText.trim() || undefined,
      );
      setSuccess(`Image uploaded for year ${uploadYear}`);
      resetUploadForm();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed, please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this success story image?")) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteSuccessStory(id);
      setSuccess("Image deleted");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to delete image");
    }
  };

  // Group items by year for display
  const groupedByYear = useMemo(() => {
    const groups: Record<number, SuccessStory[]> = {};
    items.forEach((item) => {
      if (!groups[item.year]) {
        groups[item.year] = [];
      }
      groups[item.year].push(item);
    });
    return Object.entries(groups)
      .map(([year, stories]) => ({ year: Number(year), stories }))
      .sort((a, b) => b.year - a.year);
  }, [items]);

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>Success Stories</h1>
          <p>Upload and manage success story images organised by year.</p>
        </div>
      </header>

      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? <div className="admin-success">{success}</div> : null}

      {/* Upload Panel */}
      <section className="admin-panel">
        <h2>Upload New Image</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <div>
            <div className="admin-form-row">
              <label htmlFor="ss-year">Year</label>
              <input
                id="ss-year"
                type="number"
                min={1900}
                max={2100}
                value={uploadYear}
                onChange={(e) => setUploadYear(Number(e.target.value))}
                style={{ maxWidth: "140px" }}
              />
            </div>
            <div className="admin-form-row">
              <label htmlFor="ss-file">Image</label>
              <input
                id="ss-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="admin-form-row">
              <label htmlFor="ss-alt">Description / Alt text</label>
              <input
                id="ss-alt"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe this image"
              />
            </div>
            <div
              className="admin-form-actions"
              style={{ marginTop: "0.75rem" }}
            >
              <button
                type="button"
                className="btn"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
              >
                {uploading ? "Uploading…" : "Upload Image"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={resetUploadForm}
                disabled={uploading}
                style={{ marginLeft: "0.5rem" }}
              >
                Clear
              </button>
            </div>
          </div>
          <div>
            {uploadPreview ? (
              <img
                src={uploadPreview}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: 200,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 8,
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: 14,
                }}
              >
                Image preview will appear here
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter by Year */}
      <section className="admin-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Uploaded Images</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label
              htmlFor="ss-filter-year"
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              Filter year:
            </label>
            <select
              id="ss-filter-year"
              value={filterYear === "all" ? "all" : String(filterYear)}
              onChange={(e) =>
                setFilterYear(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              style={{ minWidth: 120 }}
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ marginTop: "1rem" }}>Loading…</p>
        ) : groupedByYear.length === 0 ? (
          <p style={{ marginTop: "1rem", color: "#6b7280" }}>
            No success story images uploaded yet.
          </p>
        ) : (
          groupedByYear.map(({ year, stories }) => (
            <div key={year} style={{ marginTop: "1.5rem" }}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1b2f5b",
                  borderBottom: "2px solid #e5e7eb",
                  paddingBottom: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                {year}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                {stories.map((story) => (
                  <div
                    key={story.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <img
                      src={story.imageUrl}
                      alt={story.altText || `Success story ${story.year}`}
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <div style={{ padding: "0.5rem 0.75rem" }}>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#374151",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {story.altText || "No description"}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                          margin: "4px 0 0",
                        }}
                      >
                        {new Date(story.createdAt).toLocaleDateString()}
                      </p>
                      <button
                        type="button"
                        className="btn danger"
                        style={{
                          marginTop: "0.5rem",
                          fontSize: 12,
                          padding: "4px 10px",
                        }}
                        onClick={() => handleDelete(story.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default SuccessStoriesManager;
