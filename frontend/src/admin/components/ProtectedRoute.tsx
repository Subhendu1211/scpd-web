import React from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../auth";
import type { AdminRole } from "../api";
import { isRoleAllowed } from "../rbac";

type ProtectedRouteProps = {
  allowedRoles?: AdminRole[];
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { token, user } = useAdminAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles?.length) {
    if (!user?.role) {
      return (
        <div className="admin-card">
          <h1>Access denied</h1>
          <p>Unable to verify your role. Please log in again.</p>
          <Link to="/admin/login" className="btn">
            Go to login
          </Link>
        </div>
      );
    }

    if (!isRoleAllowed(user.role, allowedRoles)) {
      return (
        <div className="admin-card">
          <h1>Access denied</h1>
          <p>You do not have permission to view this section.</p>
          <Link to="/admin" className="btn">
            Go to dashboard
          </Link>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
