import React from "react";
import { Link } from "react-router-dom";
import { redirectToCaseManagementLogin } from "../../utils/externalNavigation";

export default function LegalOfficerLogin() {
  const handleContinue = () => {
    redirectToCaseManagementLogin("LEGAL_OFFICER");
  };

  return (
    <div className="card">
      <div className="card-body">
        <h1 style={{ margin: 0 }}>Legal Officer Login</h1>
        <p className="muted" style={{ margin: 0 }}>
          Continue to the case-management login for legal officers.
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
