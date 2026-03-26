import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fetchCmsNews, CmsNewsItem } from "../../services/cms";

const FALLBACK_ITEMS: CmsNewsItem[] = [
  { id: "f1", title: "Advisory on accessibility audits in public buildings" },
  { id: "f2", title: "Workshop on assistive technology – registrations open" },
  { id: "f3", title: "Notification: RPwD Act updates published" },
];

export default function NewsTicker() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CmsNewsItem[]>(FALLBACK_ITEMS);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const news = await fetchCmsNews(30);
        if (cancelled) return;

        const validNews = news.filter((n) => Boolean(n.title?.trim()));

        if (validNews.length > 0) {
          setItems(validNews);
        }
      } catch (err) {
        console.error("Failed to load news ticker items", err);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const list = [...items, ...items];

  return (
    <section
      className="ticker"
      aria-label="Latest updates"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          margin: "0.5px",
        }}
      >
        {/* NEWS LABEL */}
        <div
          className="label text-lg md:text-xl lg:text-2xl font-semibold"
          style={{
            backgroundColor: "#0b3a8c",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: "6px",
          }}
        >
          {t("newsTicker.label")}
        </div>

        {/* TICKER AREA */}
        <div className="viewport" aria-hidden="true">
          <div
            className="track"
            role="list"
            aria-live="polite"
            style={{
              animationPlayState: paused || hovered ? "paused" : "running",
            }}
          >
            {list.map((item, idx) => (
              <span
                role="listitem"
                key={idx}
                className="text-base md:text-lg lg:text-xl"
                style={{
                  display: "inline-flex",
                  gap: "8px",
                  color: "#0b3a8c",
                }}
              >
                •{" "}
                <Link
                  to={`/news/${item.id}`}
                  style={{
                    color: "#0b3a8c",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                  className="hover:underline"
                >
                  {item.title}
                </Link>
              </span>
            ))}
          </div>
        </div>

        {/* PAUSE / PLAY BUTTON */}
        <button
          className="btn secondary text-base md:text-lg"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label="Pause news ticker"
          style={{
            marginLeft: "auto",
            justifySelf: "end",
            marginRight: "8px",
          }}
        >
          {paused ? t("newsTicker.play") : t("newsTicker.pause")}
        </button>
      </div>
    </section>
  );
}