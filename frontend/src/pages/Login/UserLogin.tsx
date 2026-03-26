import React from "react";
import { Link } from "react-router-dom";
import { redirectToCaseManagementLogin } from "../../utils/externalNavigation";

export default function UserLogin() {
  const handleContinue = () => {
    redirectToCaseManagementLogin("CITIZEN");
  };

  return (
    <div className="card">
      <div className="card-body">
        <h1 style={{ margin: 0 }}>User Login</h1>
        <p className="muted" style={{ margin: 0 }}>
          Continue to the case-management login for citizens/users.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={handleContinue} type="button">
            Continue
          </button>
          <Link className="btn secondary" to="/login">
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
