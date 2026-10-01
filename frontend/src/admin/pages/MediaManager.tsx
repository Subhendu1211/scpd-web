import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  deleteMediaItem,
  listMedia,
  MediaCategory,
  MediaItem,
  uploadMediaBulk,
  listMediaAlbums,
  MediaAlbum,
  createMediaAlbum,
  updateMediaItem,
} from "../api";

function formatBytes(bytes?: number | string | null): string {
  if (bytes === null || bytes === undefined) {
    return "0 KB";
  }

  const numeric = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!numeric || Number.isNaN(numeric) || numeric <= 0) {
    return "0 KB";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = numeric;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${Math.round(value * 10) / 10} ${units[index]}`;
}

const CATEGORY_OPTIONS: Array<{ value: MediaCategory; label: string; hint?: string }> = [
  { value: "photo", label: "Photo Gallery" },
  { value: "video", label: "Video Gallery" },
  { value: "newspaper", label: "Newspaper Clipping" },
  { value: "audio", label: "Audio Clipping" },
  { value: "carousel", label: "Hero Carousel", hint: "Homepage hero (images or short videos)" },
];

type PreviewKind = "image" | "video" | "audio" | "pdf";

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface QueuedFile {
  uid: string;
  file: File;
  altText: string;
  previewUrl: string | null;
  previewKind: PreviewKind | null;
  status: UploadStatus;
  error: string | null;
}

function extractUploadError(err: any): string {
  const data = err?.response?.data;
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (Array.isArray(data?.errors) && data.errors.length) {
    const messages = data.errors
      .map((item: any) => item?.msg)
      .filter((msg: unknown): msg is string => typeof msg === "string" && msg.trim().length > 0);
    if (messages.length) {
      return messages.join(", ");
    }
  }
  return "Upload failed, please try again";
}

const MediaManager: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<MediaCategory>("photo");
  const [uploadQueue, setUploadQueue] = useState<QueuedFile[]>([]);
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>("photo");
  const [captionTextColor, setCaptionTextColor] = useState("#ffffff");
  const [uploading, setUploading] = useState(false);
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [albumFilter, setAlbumFilter] = useState<"all" | "unassigned" | number>(
    "all"
  );
  const [uploadAlbumId, setUploadAlbumId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMedia();
      setItems(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to fetch media library");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAlbums = useCallback(async () => {
    try {
      const data = await listMediaAlbums();
      setAlbums(data);
    } catch (err: any) {
      const message = err.response?.data?.error || "Unable to fetch albums";
      setError((current) => current ?? message);
    }
  }, []);

  useEffect(() => {
    load();
    loadAlbums();
  }, [load, loadAlbums]);

  useEffect(() => {
    return () => {
      uploadQueue.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
    };
  }, [uploadQueue]);

  useEffect(() => {
    if (uploadCategory !== "photo") {
      setUploadAlbumId(null);
    }
  }, [uploadCategory]);

  useEffect(() => {
    if (
      typeof albumFilter === "number" &&
      !albums.some((album) => album.id === albumFilter)
    ) {
      setAlbumFilter("all");
      if (uploadCategory === "photo") {
        setUploadAlbumId(null);
      }
    }
  }, [albumFilter, albums, uploadCategory]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Revoke old previews
    uploadQueue.forEach((q) => {
      if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
    });

    const newQueue: QueuedFile[] = Array.from(files).map((file, i) => {
      let previewKind: PreviewKind | null = null;
      if (file.type.startsWith("image/")) previewKind = "image";
      else if (file.type.startsWith("video/")) previewKind = "video";
      else if (file.type.startsWith("audio/")) previewKind = "audio";
      else if (file.type === "application/pdf") previewKind = "pdf";

      const baseAlt = file.name.replace(/\.[^./]+$/, "").replace(/[-_]+/g, " ").trim();

      return {
        uid: `${Date.now()}-${i}`,
        file,
        altText: baseAlt || file.name,
        previewUrl: previewKind ? URL.createObjectURL(file) : null,
        previewKind,
        status: "pending" as UploadStatus,
        error: null,
      };
    });

    setUploadQueue(newQueue);
    setUploadCategory(categoryFilter);
    setCaptionTextColor("#ffffff");
    setUploadAlbumId(
      categoryFilter === "photo" && typeof albumFilter === "number"
        ? albumFilter
        : null
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetUploadState = () => {
    setUploadQueue((prev) => {
      prev.forEach((q) => { if (q.previewUrl) URL.revokeObjectURL(q.previewUrl); });
      return [];
    });
    setCaptionTextColor("#ffffff");
    setUploadCategory(categoryFilter);
    setUploadAlbumId(
      categoryFilter === "photo" && typeof albumFilter === "number"
        ? albumFilter
        : null
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (uploadQueue.length === 0) {
      setError("Please choose at least one file to upload");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const payload = uploadQueue.map((q) => ({
        file: q.file,
        altText: q.altText.trim(),
      }));

      const res = await uploadMediaBulk(payload, {
        category: uploadCategory,
        captionTextColor: uploadCategory === "carousel" ? captionTextColor : undefined,
        albumId: uploadCategory === "photo" ? uploadAlbumId ?? undefined : undefined,
      });

      // Mark statuses
      const failedNames = new Set((res.data.failed ?? []).map((f: any) => f.name));
      setUploadQueue((prev) =>
        prev.map((q) => ({
          ...q,
          status: failedNames.has(q.file.name) ? "error" : "done",
          error: failedNames.has(q.file.name)
            ? (res.data.failed?.find((f: any) => f.name === q.file.name)?.error ?? "Failed")
            : null,
        }))
      );

      if (res.data.failed && res.data.failed.length > 0) {
        setError(`${res.data.failed.length} file(s) failed to upload`);
      }

      setCategoryFilter(uploadCategory);
      await load();
      if (uploadCategory === "photo") {
        await loadAlbums();
      }

      // Auto-close queue after short delay if all succeeded
      if (!res.data.failed || res.data.failed.length === 0) {
        setTimeout(resetUploadState, 1200);
      }
    } catch (err: any) {
      setError(extractUploadError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this asset?")) {
      return;
    }
    setError(null);
    try {
      await deleteMediaItem(id);
      setSelectedItem((current) => (current?.id === id ? null : current));
      await load();
      await loadAlbums();
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to delete media");
    }
  };

  const handleCreateAlbum = async () => {
    const name = window.prompt("Album title");
    if (!name) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    try {
      const album = await createMediaAlbum({ name: trimmed });
      await loadAlbums();
      setAlbumFilter(album.id);
      if (uploadCategory === "photo") {
        setUploadAlbumId(album.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to create album");
    }
  };

  const handleAlbumFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { value } = event.target;
    if (value === "all") {
      setAlbumFilter("all");
      if (uploadCategory === "photo") {
        setUploadAlbumId(null);
      }
      return;
    }

    if (value === "unassigned") {
      setAlbumFilter("unassigned");
      if (uploadCategory === "photo") {
        setUploadAlbumId(null);
      }
      return;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      setAlbumFilter("all");
      if (uploadCategory === "photo") {
        setUploadAlbumId(null);
      }
      return;
    }

    setAlbumFilter(numeric);
    if (uploadCategory === "photo") {
      setUploadAlbumId(numeric);
    }
  };

  const handleAlbumAssignment = async (
    mediaId: number,
    nextAlbumId: number | null
  ) => {
    setError(null);
    try {
      const updated = await updateMediaItem(mediaId, { albumId: nextAlbumId });
      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item
        )
      );
      setSelectedItem((current) =>
        current && current.id === updated.id
          ? { ...current, ...updated }
          : current
      );
      await loadAlbums();
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Unable to update album assignment"
      );
    }
  };

  const filteredItems = useMemo(() => {
    const byCategory = items.filter((item) => item.category === categoryFilter);
    if (categoryFilter !== "photo") {
      return byCategory;
    }

    if (albumFilter === "all") {
      return byCategory;
    }

    if (albumFilter === "unassigned") {
      return byCategory.filter((item) => !item.albumId);
    }

    return byCategory.filter((item) => item.albumId === albumFilter);
  }, [items, categoryFilter, albumFilter]);

  const albumFilterValue =
    typeof albumFilter === "number" ? String(albumFilter) : albumFilter;

  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="media-manager">
      <div className="media-toolbar">
        <div className="toolbar-left">
          <h1>Media Library</h1>
          <p>Curate assets for Media pages and the homepage hero carousel.</p>
        </div>
        <div className="toolbar-actions">
          <div className="filter-group">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn filter ${
                  categoryFilter === option.value ? "active" : ""
                }`}
                onClick={() => {
                  setCategoryFilter(option.value);
                  setUploadCategory(option.value);
                  if (option.value !== "photo") {
                    setAlbumFilter("all");
                    setUploadAlbumId(null);
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {categoryFilter === "photo" ? (
            <div className="album-filter">
              <select
                value={albumFilterValue}
                onChange={handleAlbumFilterChange}
                aria-label="Filter by album"
              >
                <option value="all">All albums</option>
                <option value="unassigned">Unassigned</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {`${album.name} (${album.mediaCount})`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn secondary"
                onClick={handleCreateAlbum}
              >
                New Album
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="btn primary"
            onClick={triggerFileDialog}
          >
            Upload Assets
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,application/pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {categoryFilter === "carousel" ? (
        <div className="alert info">
          Use Hero Carousel for homepage banners. Upload images or short videos and add a clear caption in the description field.
        </div>
      ) : null}

      {error && <div className="alert error">{error}</div>}

      {uploadQueue.length > 0 && (
        <div className="upload-panel upload-queue-panel">
          {/* Shared settings */}
          <div className="queue-shared-settings">
            <h2>
              Upload {uploadQueue.length} file{uploadQueue.length !== 1 ? "s" : ""}
            </h2>
            <div className="form-grid">
              <label>
                Category
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {uploadCategory === "photo" ? (
                <label>
                  Album
                  <select
                    value={uploadAlbumId ? String(uploadAlbumId) : ""}
                    onChange={(e) =>
                      setUploadAlbumId(e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">No album</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {uploadCategory === "carousel" ? (
                <label>
                  Caption text color
                  <div className="media-color-input">
                    <input
                      type="color"
                      value={captionTextColor}
                      onChange={(e) => setCaptionTextColor(e.target.value)}
                      aria-label="Choose caption text color"
                    />
                    <span>{captionTextColor.toUpperCase()}</span>
                  </div>
                </label>
              ) : null}
            </div>
          </div>

          {/* File queue list */}
          <div className="queue-file-list">
            {uploadQueue.map((item) => (
              <div
                key={item.uid}
                className={`queue-file-row queue-status-${item.status}`}
              >
                {/* Thumbnail */}
                <div className="queue-thumb">
                  {item.previewKind === "image" && item.previewUrl && (
                    <img src={item.previewUrl} alt="" />
                  )}
                  {item.previewKind === "video" && (
                    <span className="queue-thumb-icon">🎬</span>
                  )}
                  {item.previewKind === "audio" && (
                    <span className="queue-thumb-icon">🎵</span>
                  )}
                  {item.previewKind === "pdf" && (
                    <span className="queue-thumb-icon">📄</span>
                  )}
                  {!item.previewKind && (
                    <span className="queue-thumb-icon">📁</span>
                  )}
                </div>

                {/* Info + alt text */}
                <div className="queue-file-info">
                  <p className="queue-file-name">{item.file.name}</p>
                  <p className="queue-file-size">{formatBytes(item.file.size)}</p>
                  <input
                    type="text"
                    className="queue-alt-input"
                    value={item.altText}
                    placeholder="Description / alt text"
                    onChange={(e) => {
                      const val = e.target.value;
                      setUploadQueue((prev) =>
                        prev.map((q) =>
                          q.uid === item.uid ? { ...q, altText: val } : q
                        )
                      );
                    }}
                    disabled={item.status === "uploading" || item.status === "done"}
                  />
                  {item.error && (
                    <p className="queue-file-error">{item.error}</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="queue-status-badge">
                  {item.status === "pending" && (
                    <span className="badge badge-pending">Pending</span>
                  )}
                  {item.status === "uploading" && (
                    <span className="badge badge-uploading">Uploading…</span>
                  )}
                  {item.status === "done" && (
                    <span className="badge badge-done">✓ Done</span>
                  )}
                  {item.status === "error" && (
                    <span className="badge badge-error">✕ Failed</span>
                  )}
                </div>

                {/* Remove button */}
                {item.status === "pending" && (
                  <button
                    type="button"
                    className="btn-remove-queue"
                    title="Remove from queue"
                    onClick={() => {
                      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                      setUploadQueue((prev) => prev.filter((q) => q.uid !== item.uid));
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="panel-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={resetUploadState}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleUpload}
              disabled={uploading || uploadQueue.every((q) => q.status === "done")}
            >
              {uploading
                ? "Uploading…"
                : `Upload ${uploadQueue.filter((q) => q.status === "pending").length} file${uploadQueue.filter((q) => q.status === "pending").length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      <div className="media-grid">
        {loading ? (
          <div className="empty-state">Loading assets…</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <h2>No assets in this category yet</h2>
            <p>Upload a new file to populate this media section.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="media-card"
              onClick={() => setSelectedItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedItem(item);
                }
              }}
            >
              <div className="media-thumbnail">
                {item.mimeType.startsWith("image/") && (
                  <img
                    src={item.url}
                    alt={item.altText || item.originalName || item.filename}
                  />
                )}
                {item.mimeType.startsWith("video/") && (
                  <video src={item.url} muted />
                )}
                {item.mimeType.startsWith("audio/") && (
                  <div className="audio-thumb">
                    <span role="img" aria-label="Audio">
                      🎵
                    </span>
                    <p>Audio file</p>
                  </div>
                )}
                {item.mimeType === "application/pdf" && (
                  <div className="pdf-thumb">
                    <span role="img" aria-label="PDF">
                      📄
                    </span>
                    <p>PDF document</p>
                  </div>
                )}
              </div>
              <div className="media-meta">
                <h3>{item.altText || item.originalName || item.filename}</h3>
                {item.category === "photo" ? (
                  <p className="media-album-tag">
                    {item.albumName
                      ? `Album: ${item.albumName}`
                      : "Album: Unassigned"}
                  </p>
                ) : null}
                <p>{item.mimeType}</p>
                <p>
                  Uploaded {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                  {formatBytes(item.sizeBytes)}
                </p>
              </div>
              <div className="media-actions">
                <button
                  type="button"
                  className="btn danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(item.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h2>
                  {selectedItem.altText ||
                    selectedItem.originalName ||
                    selectedItem.filename}
                </h2>
                <span className="media-meta-sub">
                  {formatBytes(selectedItem.sizeBytes)} ·{" "}
                  {selectedItem.mimeType}
                </span>
                <span className="media-meta-sub">
                  Uploaded {new Date(selectedItem.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </button>
            </header>

            <section className="modal-body">
              <div className="modal-preview">
                {selectedItem.mimeType.startsWith("image/") && (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.altText || selectedItem.filename}
                  />
                )}
                {selectedItem.mimeType.startsWith("video/") && (
                  <video src={selectedItem.url} controls />
                )}
                {selectedItem.mimeType.startsWith("audio/") && (
                  <audio src={selectedItem.url} controls />
                )}
                {selectedItem.mimeType === "application/pdf" && (
                  <iframe
                    title={selectedItem.filename}
                    src={selectedItem.url}
                  />
                )}
              </div>
              <div className="modal-meta">
                {selectedItem.category === "photo" ? (
                  <label className="media-album-select">
                    <span>Album</span>
                    <select
                      value={
                        selectedItem.albumId ? String(selectedItem.albumId) : ""
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        const nextAlbum = value ? Number(value) : null;
                        if ((selectedItem.albumId ?? null) === nextAlbum) {
                          return;
                        }
                        void handleAlbumAssignment(selectedItem.id, nextAlbum);
                      }}
                    >
                      <option value="">No album</option>
                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="media-url">
                  <span>Direct URL</span>
                  <input
                    value={selectedItem.url}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </label>
                <div className="media-actions-row">
                  <a
                    href={selectedItem.url}
                    className="btn secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaManager;
