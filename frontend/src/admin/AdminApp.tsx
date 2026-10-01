import React from "react";
import { Outlet } from "react-router-dom";
import { AdminAuthProvider } from "./auth";

import "../styles/admin.css";

const AdminApp: React.FC = () => {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
};

export default AdminApp;
