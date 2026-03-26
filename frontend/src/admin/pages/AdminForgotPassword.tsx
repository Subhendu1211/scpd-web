import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestAdminPasswordReset, resetAdminPassword } from "../api";

const AdminForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ channel: "email" | "sms"; masked: string } | null>(null);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const payload: { email?: string; phone?: string; channel?: "email" | "sms" } = {};
      if (email.trim()) {
        payload.email = email.trim().toLowerCase();
      }
      if (phone.trim()) {
        payload.phone = phone.trim();
      }
      payload.channel = channel;
      if (!payload.email) {
        setError("Please enter your registered email address.");
        setLoading(false);
        return;
      }

      const response = await requestAdminPasswordReset(payload);
      const resolvedChannel = response.channel ?? channel;
      const maskedDestination = response.destination
        ? response.destination
        : resolvedChannel === "sms"
        ? maskPhone(phone || "")
        : maskEmail(email);

      setStep("verify");
      setSummary({ channel: resolvedChannel, masked: maskedDestination });
      setMessage("One-time password has been sent. It expires in 10 minutes.");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Unable to process request";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      const identifier = email.trim().toLowerCase();
      await resetAdminPassword({ email: identifier, otp: otp.trim(), password });
      setMessage("Password updated. You may now sign in.");
      setTimeout(() => navigate("/admin/login"), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Unable to reset password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-shell">
      <section className="admin-auth-aside">
        <span className="admin-auth-kicker">Credential recovery</span>
        <h1>Reset your CMS password without leaving the admin workspace.</h1>
        <p>
          Request a one-time password, verify the delivery channel, and set a
          fresh password for your administrator account.
        </p>
        <ul className="admin-auth-points">
          <li>OTP expiry window: 10 minutes</li>
          <li>Email is required for identity matching</li>
          <li>SMS or WhatsApp delivery can be used when available</li>
        </ul>
      </section>

      <div className="admin-login">
        <form
          className="admin-card admin-auth-card"
          onSubmit={step === "request" ? handleRequest : handleReset}
        >
          <div className="admin-auth-header">
            <span className="admin-auth-eyebrow">
              {step === "request" ? "Request OTP" : "Verify and reset"}
            </span>
            <h2>Reset CMS Password</h2>
            <p>
              {step === "request"
                ? "Enter your registered email address to receive a one-time password."
                : "Enter the OTP and choose your new password."}
            </p>
          </div>

          {step === "request" ? (
            <>
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <label htmlFor="forgot-phone">Phone</label>
              <input
                id="forgot-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Optional - digits only"
                autoComplete="tel"
              />

              <fieldset className="admin-radio-group">
                <legend>OTP delivery method</legend>
                <label>
                  <input
                    type="radio"
                    name="delivery"
                    value="email"
                    checked={channel === "email"}
                    onChange={() => setChannel("email")}
                  />
                  Email
                </label>
                <label>
                  <input
                    type="radio"
                    name="delivery"
                    value="sms"
                    checked={channel === "sms"}
                    onChange={() => setChannel("sms")}
                  />
                  SMS / WhatsApp
                </label>
              </fieldset>
            </>
          ) : (
            <>
              <div className="admin-auth-summary">
                <strong>
                  OTP sent to your {summary?.channel === "sms" ? "phone" : "email"}
                </strong>
                <span>{summary?.masked ? summary.masked : "Delivery in progress"}</span>
              </div>

              <label htmlFor="forgot-otp">OTP</label>
              <input
                id="forgot-otp"
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />

              <label htmlFor="forgot-password">New password</label>
              <input
                id="forgot-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />

              <label htmlFor="forgot-password-confirm">Confirm password</label>
              <input
                id="forgot-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </>
          )}

          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="admin-success">{message}</p> : null}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Please wait…" : step === "request" ? "Send OTP" : "Reset password"}
          </button>

          <p className="admin-login-help">
            <Link to="/admin/login">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

function maskEmail(value: string) {
  if (!value.includes("@")) {
    return value;
  }
  const [local, domain] = value.split("@", 2);
  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D+/g, "");
  if (digits.length <= 4) {
    return "****";
  }
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export default AdminForgotPassword;
