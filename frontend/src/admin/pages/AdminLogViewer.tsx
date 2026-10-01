import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AuditScope,
  AdminUserLog,
  PageWorkflowLog,
  fetchAuditLogs
} from "../api";

const DEFAULT_SCOPE: AuditScope = "user";

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function stringify(value?: Record<string, unknown> | null) {
  if (!value) {
    return "—";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const AdminLogViewer: React.FC = () => {
  const [scope, setScope] = useState<AuditScope>(DEFAULT_SCOPE);
  const [logs, setLogs] = useState<Array<AdminUserLog | PageWorkflowLog>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxPage = useMemo(() => {
    if (!total) {
      return 1;
    }
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuditLogs(scope, page, pageSize);
      setLogs(response.data);
      setTotal(response.pagination.total);
    } catch (err: any) {
      const message = err.response?.data?.error || "Unable to load logs";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [scope, page, pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleScopeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setScope(event.target.value as AuditScope);
    setPage(1);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const handlePrev = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(maxPage, prev + 1));
  };

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Review administrator actions and page workflow transitions with pagination controls.</p>
        </div>
        <div className="admin-toolbar">
          <label className="admin-toolbar-field">
            <span>Scope</span>
            <select value={scope} onChange={handleScopeChange}>
              <option value="user">User Activity</option>
              <option value="workflow">Workflow Transitions</option>
            </select>
          </label>
          <label className="admin-toolbar-field">
            <span>Page size</span>
            <select value={pageSize} onChange={handlePageSizeChange}>
              {[10, 25, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn secondary" onClick={loadLogs} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="admin-panel">
        <div className="admin-card-header">
          <h2>{scope === "user" ? "User activity" : "Workflow transitions"}</h2>
          <span className="menu-chip subtle">{total} records</span>
        </div>

        <div className="admin-table-wrapper">
          {scope === "user" ? <UserLogTable logs={logs as AdminUserLog[]} /> : <WorkflowLogTable logs={logs as PageWorkflowLog[]} />}
        </div>

        <div className="admin-pagination">
          <button type="button" className="btn secondary" onClick={handlePrev} disabled={page === 1 || loading}>
            Previous
          </button>
          <span>
            Page {page} of {maxPage}
          </span>
          <button type="button" className="btn secondary" onClick={handleNext} disabled={page >= maxPage || loading}>
            Next
          </button>
        </div>
      </section>
    </div>
  );
};

const UserLogTable: React.FC<{ logs: AdminUserLog[] }> = ({ logs }) => {
  if (!logs.length) {
    return <p>No user activity recorded yet.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Target</th>
          <th>IP</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>{formatDateTime(log.createdAt)}</td>
            <td>
              {log.userName ? `${log.userName} ` : ""}
              {log.userEmail ? <small>({log.userEmail})</small> : "—"}
            </td>
            <td>{log.action}</td>
            <td>
              {log.targetType ? `${log.targetType}${log.targetId ? `#${log.targetId}` : ""}` : "—"}
            </td>
            <td>{log.ipAddress || "—"}</td>
            <td>
              <pre className="admin-log-json">{stringify(log.details)}</pre>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const WorkflowLogTable: React.FC<{ logs: PageWorkflowLog[] }> = ({ logs }) => {
  if (!logs.length) {
    return <p>No workflow transitions captured yet.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Page</th>
          <th>Actor</th>
          <th>Transition</th>
          <th>Comment</th>
          <th>Metadata</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>{formatDateTime(log.createdAt)}</td>
            <td>
              {log.menuLabel ? log.menuLabel : `Menu #${log.menuItemId}`}
              {log.menuPath ? <small> ({log.menuPath})</small> : null}
            </td>
            <td>
              {log.actorName ? `${log.actorName} ` : ""}
              {log.actorEmail ? <small>({log.actorEmail})</small> : "—"}
            </td>
            <td>
              {log.fromStatus || ""}
              {log.toStatus ? ` → ${log.toStatus}` : ""}
            </td>
            <td>{log.comment || "—"}</td>
            <td>
              <pre className="admin-log-json">{stringify(log.metadata)}</pre>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AdminLogViewer;
