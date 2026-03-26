import React, { useMemo } from "react";
import { CmsPageRecord } from "../../services/cms";
import { markdownToHtml } from "../../utils/markdown";
import { Typography } from "@mui/material";
import DOMPurify from "dompurify";

interface CmsContentProps {
  loading: boolean;
  error: string | null;
  page: CmsPageRecord | null;
  children?: React.ReactNode;
  imageMaxWidth?: string;
  bodyFontSize?: string;
  heroAlign?: "left" | "center" | "right";
  contentWithImageRow?: boolean;
  showSummary?: boolean;
  collapseSingleLineBreaks?: boolean;
}

export default function CmsContent({
  loading,
  error,
  page,
  children,
  imageMaxWidth,
  bodyFontSize,
  heroAlign = "center",
  contentWithImageRow = false,
  showSummary = true,
  collapseSingleLineBreaks = false,
}: CmsContentProps) {
  const resolveHeroImageUrl = (rawPath: string | null | undefined): string | null => {
    if (!rawPath || typeof rawPath !== "string") {
      return null;
    }

    const trimmed = rawPath.trim();
    if (!trimmed) {
      return null;
    }

    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }

    const normalizedPath = (() => {
      if (trimmed.startsWith("/uploads/")) {
        return trimmed;
      }
      if (trimmed.startsWith("uploads/")) {
        return `/${trimmed}`;
      }
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
  };

  const heroImageUrl = resolveHeroImageUrl(page?.heroImagePath);

  if (loading) {
    return <p>Loading content…</p>;
  }

  if (error) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Content unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Content unavailable</h1>
        <p>The requested page could not be found.</p>
      </div>
    );
  }

  const bodyText = useMemo(() => {
    const raw = page.body || "";
    if (!collapseSingleLineBreaks) {
      return raw;
    }

    return raw
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([^\n])\n(?=[^\n])/g, "$1 ");
  }, [page.body, collapseSingleLineBreaks]);

  const html = useMemo(() => {
    const looksLikeRichHtml = /<\/?[a-z][\s\S]*>/i.test(bodyText);
    if (looksLikeRichHtml) {
      return DOMPurify.sanitize(bodyText);
    }
    return markdownToHtml(bodyText);
  }, [bodyText]);
  const layoutStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {};
    if (page.fontFamily) base.fontFamily = page.fontFamily;
    if (page.fontColor) base.color = page.fontColor;
    if (page.backgroundColor) base.background = page.backgroundColor;
    switch (page.pageLayout) {
      case "narrow":
        return {
          ...base,
          maxWidth: "820px",
          margin: "0 auto",
          padding: "5px 0",
        };
      case "wide":
        return {
          ...base,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "5px 0",
        };
      case "full":
        return { ...base, width: "100%", padding: "5px 0" };
      default:
        return { ...base, width: "100%", padding: "5px 0" };
    }
  })();
  if (imageMaxWidth) {
    (layoutStyle as React.CSSProperties & Record<string, string>)["--cms-image-max-width"] = imageMaxWidth;
  }
  if (bodyFontSize) {
    (layoutStyle as React.CSSProperties & Record<string, string>)["--cms-body-font-size"] = bodyFontSize;
  }
  const timestamp = page.showPublishDate ? page.publishedAt : null;
  const heroImageGalleryPaths = (
    page.heroImagePaths && page.heroImagePaths.length > 0
      ? page.heroImagePaths
      : page.heroImagePath
        ? [page.heroImagePath]
        : []
  )
    .map((path) => resolveHeroImageUrl(path))
    .filter((path): path is string => Boolean(path));
  const bodyContent = (
    <div
      className="cms-body"
      style={{
        fontSize: "var(--cms-body-font-size, 17px)",
        lineHeight: "1.7",
        marginTop: "10px",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  return (
    <div style={layoutStyle}>
      {/* PAGE TITLE */}
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          marginBottom: "10px",
          paddingBottom: "6px",
          borderBottom: "2px solid orange",
        }}
      >
        {page.title || page.label}
      </h1>

      {/* Summary */}
      {showSummary && page.summary ? (
        <p style={{ fontSize: "16px", color: "#555" }}>{page.summary}</p>
      ) : null}

      {/* Publish date (optional) */}
      {timestamp ? (
        <p style={{ color: "#888", fontSize: "14px", marginTop: "-4px" }}>
          Published on {new Date(timestamp).toLocaleString()}
        </p>
      ) : null}

      {heroImageUrl && contentWithImageRow ? (
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            flexDirection: heroAlign === "left" ? "row-reverse" : "row",
          }}
        >
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>{bodyContent}</div>
          <div style={{ flex: "0 1 var(--cms-image-max-width, 680px)", width: "100%" }}>
            <img
              src={heroImageUrl}
              alt=""
              style={{
                width: "100%",
                maxWidth: "var(--cms-image-max-width, 680px)",
                display: "block",
                margin: "0",
                borderRadius: "6px",
              }}
            />
          </div>
        </div>
      ) : (
        <>
          {heroImageGalleryPaths.length > 0 ? (
            <div
              style={{
                marginTop: "15px",
                marginBottom: "20px",
                display: "grid",
                gridTemplateColumns:
                  heroImageGalleryPaths.length > 1
                    ? "repeat(auto-fit, minmax(300px, 1fr))"
                    : "1fr",
                justifyItems:
                  heroAlign === "right"
                    ? "end"
                    : heroAlign === "left"
                      ? "start"
                      : "center",
                gap: "15px",
              }}
            >
              {heroImageGalleryPaths.map((path, idx) => (
                <div key={idx} style={{ width: "100%", textAlign: "center" }}>
                  <img
                    src={path}
                    alt={`Hero ${idx + 1}`}
                    style={{
                      width: "100%",
                      maxWidth:
                        heroImageGalleryPaths.length > 1
                          ? "100%"
                          : "var(--cms-image-max-width, 680px)",
                      maxHeight: "500px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  />
                  {page.heroImageCaptions?.[idx] ? (
                    <p
                      style={{
                        marginTop: "8px",
                        fontSize: "14px",
                        color: "#666",
                        fontStyle: "italic",
                      }}
                    >
                      {page.heroImageCaptions[idx]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {bodyContent}
        </>
      )}

      {/* Attachments Section */}
      {page.attachmentsPaths && page.attachmentsPaths.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
          }}
        >
          <h3 style={{ fontSize: "20px", marginBottom: "15px" }}>
            Attachments & Resources
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "15px",
            }}
          >
            {page.attachmentsPaths.map((path, idx) => {
              const fileName = path.split("/").pop();
              const isPdf = path.toLowerCase().endsWith(".pdf");

              return (
                <a
                  key={idx}
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: "inherit",
                    background: "#ffffff",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    overflow: "hidden",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 25px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 10px rgba(0,0,0,0.05)";
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: isPdf ? "80px" : "160px",
                      backgroundColor: isPdf ? "#f8fafc" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isPdf ? (
                      <div
                        style={{
                          fontSize: "40px",
                          color: "#ef4444",
                        }}
                      >
                        📄
                      </div>
                    ) : (
                      <img
                        src={path}
                        alt={fileName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{ padding: "12px", borderTop: "1px solid #f1f5f9" }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "14px",
                        fontWeight: 600,
                        textAlign: "center",
                        wordBreak: "break-all",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        color: "#334155",
                      }}
                    >
                      {page.attachmentsCaptions?.[idx] || fileName}
                    </Typography>
                    {isPdf && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          textAlign: "center",
                          mt: 0.5,
                          color: "#94a3b8",
                          fontWeight: 700,
                        }}
                      >
                        PDF DOCUMENT
                      </Typography>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
