import React, { useEffect, useMemo, useState } from "react";
import { fetchCmsNews } from "../../services/cms";

type NewsItem = {
  id: string;
  title: string;
  date?: string; // ISO
  to?: string;
  img?: string;
};

const FALLBACK_ITEMS: NewsItem[] = [
  {
    id: "n1",
    title: "Advisory on accessibility audits in public buildings",
    date: "2025-10-18",
    to: "/notice-board",
    img: new URL("../../assets/news/news-01.jpg", import.meta.url).href
  },
  {
    id: "n2",
    title: "Workshop on assistive technology – registrations open",
    date: "2025-10-12",
    to: "/notice-board",
    img: new URL("../../assets/news/news-02.jpg", import.meta.url).href
  },
  {
    id: "n3",
    title: "Notification: RPwD Act updates published",
    date: "2025-09-30",
    to: "/notice-board",
    img: new URL("../../assets/news/news-03.jpg", import.meta.url).href
  }
];

export default function NewsGallery() {
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const items = await fetchCmsNews(9);
        if (cancelled) return;
        if (items?.length) {
          setNews(
            items.map((n, idx) => ({
              id: String(n.id ?? idx),
              title: n.title ?? "Untitled news",
              date: n.publishedAt ?? n.createdAt ?? undefined,
              to: n.url ?? n.link ?? "/notice-board",
              img: n.imageUrl ?? undefined,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load news gallery", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  const items = useMemo(() => news, [news]);

  return (
    <section className="news-gallery card" aria-label="News gallery">
      <div className="card-body">
        <div className="header">
          <h2>News</h2>
          <a className="view-all" href="/notice-board" aria-label="View all news">View all →</a>
        </div>
        <div className="news-grid">
          {items.map((n) => (
            <article key={n.id} className="news-card">
              {n.img ? (
                <img
                  className="thumb"
                  src={n.img}
                  alt=""
                  aria-hidden="true"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <div className="body">
                <div className="meta">
                  {/* Published date removed as per UI update */}
                </div>
                <h3 className="title">
                  <a href={n.to ?? "/notice-board"} style={{ textDecoration: "none" }}>{n.title}</a>
                </h3>
                <a className="more" href={n.to ?? "/notice-board"} aria-label={`Read more: ${n.title}`}>
                  Read more
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}