const MEDIA_FIELD_CANDIDATES = [
  "photos",
  "photo_urls",
  "photoUrls",
  "images",
  "gallery_images",
  "gallery",
  "image",
  "image_url",
  "imageUrl",
  "photo",
];

function resolveEventMediaUrl(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";

  if (
    /^(https?:)?\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const normalizedPath = (() => {
    if (trimmed.startsWith("/uploads/")) return trimmed;
    if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
    if (!trimmed.includes("/") && !trimmed.startsWith("/")) {
      return `/uploads/media/${trimmed}`;
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  })();

  const apiBase = String(import.meta.env.VITE_API_URL || "").trim();
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      const apiUrl = new URL(apiBase);
      return `${apiUrl.origin}${normalizedPath}`;
    } catch {
      return normalizedPath;
    }
  }

  return normalizedPath;
}

function parseEventPhotoList(value: unknown): string[] {
  const urls: string[] = [];

  const pushUrl = (candidate: unknown) => {
    if (typeof candidate !== "string") return;
    const trimmed = candidate.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach((entry) => pushUrl(entry));
          return;
        }
      } catch {
        // Keep as plain text when not valid JSON.
      }
    }

    if (trimmed.includes(",") && !/^https?:\/\//i.test(trimmed)) {
      trimmed.split(",").forEach((entry) => pushUrl(entry));
      return;
    }

    urls.push(resolveEventMediaUrl(trimmed));
  };

  if (Array.isArray(value)) {
    value.forEach((entry) => pushUrl(entry));
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    pushUrl(record.url);
    pushUrl(record.path);
    pushUrl(record.src);
  } else {
    pushUrl(value);
  }

  return urls.filter(Boolean);
}

export function extractEventPhotos(row: Record<string, unknown>): string[] {
  const candidates = MEDIA_FIELD_CANDIDATES.map((field) => row[field]);
  const merged = candidates.flatMap((value) => parseEventPhotoList(value));
  return Array.from(new Set(merged.filter(Boolean)));
}
