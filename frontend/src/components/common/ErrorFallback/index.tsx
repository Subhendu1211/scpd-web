import React from "react";
import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";

export default function ErrorFallback() {
  const err = useRouteError();

  // Helpful diagnostics while developing.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[ErrorFallback] Route/render error:", err);
  }

  const safeStringify = (value: unknown) => {
    try {
      const seen = new WeakSet<object>();
      return JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === "object" && val !== null) {
            if (seen.has(val as object)) return "[Circular]";
            seen.add(val as object);
          }
          if (typeof val === "bigint") return val.toString();
          return val;
        },
        2
      );
    } catch {
      return String(value);
    }
  };

  if (isRouteErrorResponse(err)) {
    if (err.status === 404) {
      return (
        <section className="container" style={{ padding: "24px 0" }}>
          <h1>Page not found</h1>
          <p>The page you’re looking for doesn’t exist.</p>
          <p><Link className="btn" to="/">Go to Home</Link></p>
        </section>
      );
    }
    return (
      <section className="container" style={{ padding: "24px 0" }}>
        <h1>{err.status} {err.statusText}</h1>
        <p>{(err.data as string) || "An error occurred."}</p>
        {import.meta.env.DEV ? (
          <pre style={{
            whiteSpace: "pre-wrap",
            background: "#0b1020",
            color: "#e6edf3",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            overflowX: "auto",
          }}>{safeStringify(err.data)}</pre>
        ) : null}
      </section>
    );
  }

  const errorObj = err instanceof Error ? err : null;
  const message = errorObj?.message || (typeof err === "string" ? err : "An unexpected error occurred.");
  const details = errorObj?.stack || (err ? safeStringify(err) : "(no details)");
  return (
    <section className="container" style={{ padding: "24px 0" }}>
      <h1>Something went wrong</h1>
      <p style={{ marginTop: 8 }}>{message}</p>
      {import.meta.env.DEV ? (
        <pre style={{
          whiteSpace: "pre-wrap",
          background: "#0b1020",
          color: "#e6edf3",
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          overflowX: "auto",
        }}>{details}</pre>
      ) : null}
      <p><Link className="btn" to="/">Go to Home</Link></p>
    </section>
  );
}