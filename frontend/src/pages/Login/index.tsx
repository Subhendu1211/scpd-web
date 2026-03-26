import React from "react";
import { Link } from "react-router-dom";

const tileStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 8,
  background: "#fff"
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10
};

export default function Login() {
  return (
    <div className="card">
      <div className="card-body">
        <h1 style={{ margin: 0 }}>Login As</h1>
        <p className="muted" style={{ margin: 0 }}>
          Choose your role to continue.
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
          }}
        >
          <section style={tileStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Admin</h2>
            <p className="muted" style={{ margin: 0 }}>
              SCPD CMS administration portal.
            </p>
            <div style={actionsStyle}>
              <Link className="btn" to="/admin/login">
                Open Admin Login
              </Link>
            </div>
          </section>

          <section style={tileStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Legal Officer</h2>
            <p className="muted" style={{ margin: 0 }}>
              Access case-management workflow for legal officer role.
            </p>
            <div style={actionsStyle}>
              <Link className="btn" to="/legal-officer/login">
                Open Legal Officer Login
              </Link>
            </div>
          </section>

          <section style={tileStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>User</h2>
            <p className="muted" style={{ margin: 0 }}>
              Citizen/public access for case-management services.
            </p>
            <div style={actionsStyle}>
              <Link className="btn" to="/user/login">
                Open User Login
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
