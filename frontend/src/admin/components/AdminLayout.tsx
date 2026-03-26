import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import {
  ADMIN_ONLY_ROLES,
  CONTENT_ADMIN_ROLES,
  MENU_ADMIN_ROLES,
} from "../rbac";

const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const role = user?.role;
  const canManageMenu = !!role && MENU_ADMIN_ROLES.includes(role);
  const canManageContent = !!role && CONTENT_ADMIN_ROLES.includes(role);
  const canManageUsers = !!role && ADMIN_ONLY_ROLES.includes(role);
  const canManageSchema = canManageUsers;
  const canViewLogs = canManageUsers;
  const displayName = user?.fullName ? `${user.fullName}` : user?.email;
  const roleLabel = role ? role.replace(/_/g, " ") : "admin";

  const onLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span>SCPD Admin</span>
          <small>Content management workspace</small>
          <div className="admin-brand-meta">
            {displayName ? <span>{displayName}</span> : null}
            <span className="admin-role-pill">{roleLabel}</span>
          </div>
        </div>
        <div className="admin-nav-group">
          <span className="admin-nav-label">Overview</span>
          <nav className="admin-nav">
            <NavLink to="/admin" end>
              Dashboard
            </NavLink>
          </nav>
        </div>
        <div className="admin-nav-group">
          <span className="admin-nav-label">Publishing</span>
          <nav className="admin-nav">
            {canManageMenu ? (
              <NavLink to="/admin/menu">Navigation</NavLink>
            ) : null}
            {canManageMenu ? (
              <NavLink to="/admin/org-chart">Org Chart</NavLink>
            ) : null}
            <NavLink to="/admin/pages">Pages</NavLink>
            {canManageContent ? (
              <NavLink to="/admin/events">Events</NavLink>
            ) : null}
            {canManageContent ? <NavLink to="/admin/news">News</NavLink> : null}
            {canManageContent ? <NavLink to="/admin/feedback">Feedback</NavLink> : null}
            {canManageContent ? <NavLink to="/admin/media">Media</NavLink> : null}
          </nav>
        </div>
        {canManageSchema || canManageUsers || canViewLogs ? (
          <div className="admin-nav-group">
            <span className="admin-nav-label">Administration</span>
            <nav className="admin-nav">
              {canManageSchema ? (
                <NavLink to="/admin/schema">Tables</NavLink>
              ) : null}
              {canManageUsers ? <NavLink to="/admin/users">Users</NavLink> : null}
              {canViewLogs ? <NavLink to="/admin/logs">Audit Logs</NavLink> : null}
            </nav>
          </div>
        ) : null}
        <div className="admin-sidebar-footer">
          <p>Keep navigation, content, and review workflow aligned from one console.</p>
        </div>
        <button type="button" className="admin-logout" onClick={onLogout}>
          Log out
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
