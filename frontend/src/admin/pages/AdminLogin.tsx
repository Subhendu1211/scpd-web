import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";

const AdminLogin: React.FC = () => {
  const { login, token, loading, error } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || "/admin";

  if (token) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await login({ email: email.trim(), password });
    if (ok) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="admin-auth-shell">
      <section className="admin-auth-aside">
        <span className="admin-auth-kicker">SCPD CMS</span>
        <h1>Admin access for publishing, review, and navigation control.</h1>
        <p>
          Sign in to manage website pages, structure, media, public updates,
          and workflow approvals from the central admin workspace.
        </p>
        <ul className="admin-auth-points">
          <li>Publish and review page updates</li>
          <li>Manage menus, events, media, and announcements</li>
          <li>Track editorial activity and audit logs</li>
        </ul>
      </section>

      <div className="admin-login">
        <form className="admin-card admin-auth-card" onSubmit={handleSubmit}>
          <div className="admin-auth-header">
            <span className="admin-auth-eyebrow">Welcome back</span>
            <h2>SCPD CMS Login</h2>
            <p>Use your registered admin credentials to continue.</p>
          </div>

          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="admin-login-help">
            <Link to="/admin/forgot-password">Forgot password?</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
