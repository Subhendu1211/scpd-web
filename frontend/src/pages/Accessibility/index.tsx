import React from "react";

export default function Accessibility() {
  return (
    <section
      className="container"
      style={{
        padding: "16px 0",
        fontSize: "1.3rem",
        lineHeight: 1.65,
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "14px" }}>Accessibility Statement</h1>
      <p style={{ fontSize: "1.3rem" }}>
        SCPD is committed to making its website accessible, in accordance with the
        Rights of Persons with Disabilities (RPwD) Act and WCAG 2.1 Level AA guidelines.
      </p>

      <h2 style={{ fontSize: "2.3rem", marginTop: "18px" }}>Measures to support accessibility</h2>
      <ul>
        <li>Semantic HTML with ARIA where appropriate</li>
        <li>Keyboard-accessible navigation and dropdowns</li>
        <li>Visible focus styles and skip-to-content link</li>
        <li>Resizable text and high-contrast mode</li>
      </ul>

      <h2 style={{ fontSize: "2.3rem", marginTop: "18px" }}>Conformance status</h2>
      <p style={{ fontSize: "1.3rem" }}>
        The site aims for WCAG 2.1 AA. Some documents and legacy content may not yet fully conform.
      </p>

      <h2 style={{ fontSize: "2.3rem", marginTop: "18px" }}>Feedback</h2>
      <p style={{ fontSize: "1.3rem" }}>
        We welcome your feedback on accessibility. Please contact:
        <br />
        Email: <a href="mailto:accessibility@example.gov.in">accessibility@example.gov.in</a>
        <br />
        Phone: <a href="tel:+910000000000">+91 00000 00000</a>
      </p>

      <h2 style={{ fontSize: "2.3rem", marginTop: "18px" }}>Compatibility</h2>
      <p style={{ fontSize: "1.3rem" }}>This site works with modern browsers and assistive technologies.</p>

      <h2 style={{ fontSize: "2.3rem", marginTop: "18px" }}>Keyboard shortcuts</h2>
      <ul>
        <li>Use Tab/Shift+Tab to move between links and controls</li>
        <li>In menus: Arrow keys navigate items, Esc closes menus</li>
      </ul>

      <h2 style={{ fontSize: "2.3rem", marginTop: "18px" }}>Customizations</h2>
      <p style={{ fontSize: "1.3rem" }}>
        Use the Accessibility controls (A-/A/A+, High Contrast) above the main content to adjust text
        size and contrast to your preference.
      </p>
    </section>
  );
}