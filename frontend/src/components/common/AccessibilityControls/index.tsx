import React, { useEffect, useState } from "react";

export default function AccessibilityControls() {
  const [size, setSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.fontSize = `${size}%`;
    }
  }, [size]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("high-contrast", highContrast);
    }
  }, [highContrast]);

  return (
    <div className="container" style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 16px" }}>
      <span className="muted" style={{ fontSize: 12 }}>Accessibility:</span>
      <button className="btn" onClick={() => setSize((s) => Math.max(85, s - 10))} aria-label="Decrease text size">A-</button>
      <button className="btn" onClick={() => setSize(100)} aria-label="Reset text size">A</button>
      <button className="btn" onClick={() => setSize((s) => Math.min(150, s + 10))} aria-label="Increase text size">A+</button>
      <button
        className="btn"
        aria-pressed={highContrast}
        onClick={() => setHighContrast((v) => !v)}
      >
        High Contrast
      </button>
    </div>
  );
}