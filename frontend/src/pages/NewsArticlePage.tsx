import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchNewsItem, CmsNewsItem } from "../services/cms";
import DOMPurify from "dompurify";
import { marked } from "marked";

const NewsArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [newsItem, setNewsItem] = useState<CmsNewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNewsItem(id);
        setNewsItem(data);
      } catch (err) {
        console.error("Failed to load news item:", err);
        setError(
          "Unable to load the news article. It might have been removed.",
        );
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <main
        className="container"
        style={{ padding: "40px 16px", minHeight: "60vh" }}
      >
        <p>Loading news...</p>
      </main>
    );
  }

  if (error || !newsItem) {
    return (
      <main
        className="container"
        style={{ padding: "40px 16px", minHeight: "60vh" }}
      >
        <div
          style={{
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            padding: "16px",
            borderRadius: "8px",
          }}
        >
          <h2>Article not found</h2>
          <p>{error || "We could not find the requested news article."}</p>
          <Link
            to="/"
            style={{
              color: "#1d4ed8",
              textDecoration: "underline",
              display: "inline-block",
              marginTop: 12,
            }}
          >
            Return to Homepage
          </Link>
        </div>
      </main>
    );
  }

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const createMarkup = (markdownText: string) => {
    const rawHtml = marked.parse(markdownText, { async: false }) as string;
    return { __html: DOMPurify.sanitize(rawHtml) };
  };

  return (
    <main
      className="container news-article-page"
      style={{
        padding: "40px 16px",
        maxWidth: "980px",
        margin: "0 auto",
        minHeight: "75vh",
      }}
    >
      <Link
        to="/"
        style={{
          color: "#4f46e5",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 24,
          fontWeight: 500,
          fontSize: "1.05rem",
        }}
      >
        &larr; Back to Home
      </Link>

      <article>
        <header
          style={{
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 24,
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2.9rem, 5vw, 4rem)",
              color: "#111827",
              marginBottom: 16,
              lineHeight: 1.12,
              fontWeight: 700,
            }}
          >
            {newsItem.title}
          </h1>
          <div
            style={{
              display: "flex",
              gap: 16,
              color: "#6b7280",
              fontSize: "1.1rem",
            }}
          >
            {newsItem.publishedAt && (
              <span>
                <strong>Published on:</strong> {fmtDate(newsItem.publishedAt)}
              </span>
            )}
          </div>
        </header>

        <div
          className="news-content"
          style={{ fontSize: "1.35rem", lineHeight: 1.95, color: "#374151" }}
        >
          {newsItem.imageUrl ? (
            <img
              src={newsItem.imageUrl}
              alt={newsItem.title}
              style={{
                width: "100%",
                maxHeight: 460,
                objectFit: "cover",
                borderRadius: 10,
                marginBottom: 24,
              }}
            />
          ) : null}
          {newsItem.body ? (
            <div dangerouslySetInnerHTML={createMarkup(newsItem.body)} />
          ) : (
            <p>
              <i>No further details provided for this news item.</i>
            </p>
          )}
        </div>
      </article>
      <style>{`
        .news-content p { margin-bottom: 1.5em; }
        .news-content h2, .news-content h3 { margin-top: 2em; margin-bottom: 1em; color: #111827; font-size: 1.65em; line-height: 1.25; }
        .news-content ul, .news-content ol { margin-bottom: 1.5em; padding-left: 2em; }
        .news-content li { margin-bottom: 0.5em; }
        .news-content a { color: #2563eb; text-decoration: underline; }
        .news-content img { max-width: 100%; border-radius: 8px; margin: 2em 0; }
        .news-content blockquote { border-left: 4px solid #d1d5db; padding-left: 1em; color: #4b5563; font-style: italic; margin-left: 0; }
      `}</style>
    </main>
  );
};

export default NewsArticlePage;
