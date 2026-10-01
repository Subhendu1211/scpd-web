import React, { useEffect, useRef, useState } from "react";

type Officer = {
  name: string;
  designation: string;
  photo: string; // use new URL(..., import.meta.url).href
  message?: string;
};

const slides: Officer[] = [
  {
    name: "Shri/Dr. A. Person",
    designation: "State Commissioner",
    photo: new URL("../../assets/officers/commissioner.jpg", import.meta.url).href,
    message: "Committed to accessibility and inclusion."
  },
  {
    name: "Shri/Dr. B. Person",
    designation: "Additional Commissioner",
    photo: new URL("../../assets/officers/additional-commissioner.jpg", import.meta.url).href
  },
  {
    name: "Shri/Dr. C. Person",
    designation: "Joint Commissioner",
    photo: new URL("../../assets/officers/joint-commissioner.jpg", import.meta.url).href
  }
];

export default function OfficerCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useEffect(() => {
    if (!slides.length || paused || reduced) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setI(v => (v + 1) % slides.length), 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, reduced]);

  const prev = () => setI(v => (v - 1 + slides.length) % slides.length);
  const next = () => setI(v => (v + 1) % slides.length);

  const s = slides[i];

  return (
    <section
      className="officer-hero card"
      role="region"
      aria-roledescription="carousel"
      aria-label="Key officials"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="slide">
        <img
          className="photo"
          src={s.photo}
          alt={`${s.name}, ${s.designation}`}
          width={180}
          height={180}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
        />
        <div className="meta">
          <div className="badge">Key Official</div>
          <h2 className="name">{s.name}</h2>
          <div className="role">{s.designation}</div>
          {s.message && <p className="msg">{s.message}</p>}
          <div className="dots" role="tablist" aria-label="Slides">
            {slides.map((_, idx) => (
              <button
                key={idx}
                role="tab"
                aria-selected={i === idx}
                aria-controls={`slide-${idx}`}
                className={`dot ${i === idx ? "active" : ""}`}
                onClick={() => setI(idx)}
                title={`Show slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="controls">
        <button className="btn secondary" onClick={() => setPaused(p => !p)} aria-pressed={paused}>
          {paused ? "Play" : "Pause"}
        </button>
        <button className="btn secondary" onClick={prev} aria-label="Previous">‹</button>
        <button className="btn secondary" onClick={next} aria-label="Next">›</button>
      </div>
    </section>
  );
}