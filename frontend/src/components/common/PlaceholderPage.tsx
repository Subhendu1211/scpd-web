import React from "react";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="card">
      <div className="card-body">
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p>This page is under construction.</p>
      </div>
    </section>
  );
}