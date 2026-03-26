import React from "react";

export default function LogoSection() {
  return (
    <div className="logo-wrap" aria-label="SCPD logo">
      <img
        src="/assets/odisha-logo.png"
        alt="Government of Odisha logo"
        width={64}
        height={64}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}