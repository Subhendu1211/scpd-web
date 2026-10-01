import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="container" style={{ padding: "24px 0" }}>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <p><Link className="btn" to="/">Go to Home</Link></p>
    </section>
  );
}