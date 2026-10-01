import React, { useEffect, useState } from "react";
import { listFeedbackSubmissions, AdminFeedbackSubmission } from "../api";

const FeedbackManager: React.FC = () => {
  const [items, setItems] = useState<AdminFeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFeedbackSubmissions();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to fetch feedback submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>Feedback Submissions</h1>
          <p>Review messages sent from the public feedback form and monitor response volume.</p>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}

      <section className="admin-panel">
        <div className="admin-card-header">
          <h2>Incoming feedback</h2>
          <span className="menu-chip subtle">{items.length} total</span>
        </div>

        <div className="admin-table-wrapper">
          {loading ? (
            <p>Loading…</p>
          ) : items.length === 0 ? (
            <p>No feedback submissions yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Submitted</th>
                  <th style={{ width: 180 }}>Name</th>
                  <th style={{ width: 220 }}>Email</th>
                  <th style={{ width: 220 }}>Subject</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{fmt(item.createdAt)}</td>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.subject || "—"}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default FeedbackManager;
