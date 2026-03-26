import React, { useEffect, useMemo, useState } from "react";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const NewsTable: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  const recentNews = useMemo(() => news.slice(0, 6), [news]);

  return (
    <section style={{ margin: "24px 0" }}>
      <h2>News Table</h2>
      <div className="admin-table-wrapper" role="region" aria-label="News table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Content</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {news.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.content}</td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? (
        <div className="dashboard-empty-note">Loading news...</div>
      ) : !recentNews.length ? (
        <div className="dashboard-empty-note">No news available.</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table dashboard-news-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Summary</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentNews.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.content || "No summary available."}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default NewsTable;
