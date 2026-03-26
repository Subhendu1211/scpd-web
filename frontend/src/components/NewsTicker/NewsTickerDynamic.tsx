import React, { useEffect, useState } from "react";

export default function NewsTickerDynamic() {
  const [news, setNews] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setNews(data.map((n: any) => n.title)))
      .catch(() => setNews([]));
  }, []);

  if (!news.length) return null;

  const list = [...news, ...news];

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
        <div className="label">News</div>
        <div className="viewport" aria-hidden="true">
          <div
            className="track"
            role="list"
            aria-live="polite"
            style={{
              animationPlayState: paused || hovered ? ("paused" as const) : "running",
            }}
          >
            {list.map((t, idx) => (
              <span role="listitem" key={idx}>
                • {t}
              </span>
            ))}
          </div>
        </div>
        <button
          className="btn secondary"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label="Pause news ticker"
          style={{ marginLeft: "auto", justifySelf: "end", marginRight: "8px" }}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
}
