import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  requestAdminLoginOtp,
  verifyAdminLoginOtp,
  AdminLoginOtpRequestResponse,
} from "../api";
import { useAdminAuth } from "../auth";

const AdminLogin: React.FC = () => {
  const { token, error, establishSession, setErrorMessage } = useAdminAuth();
  const isDev = import.meta.env.DEV;
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [challenge, setChallenge] = useState<AdminLoginOtpRequestResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || "/admin";

  if (token) {
    return <Navigate to={from} replace />;
  }

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await requestAdminLoginOtp({
        identifier: identifier.trim(),
        password: password.trim(),
        channel,
      });
      setChallenge(result);
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.error;
      const message =
        status === 401
          ? "Invalid credentials. Check email/mobile and password, or use Forgot password to reset access."
          : apiMessage || "Unable to send OTP";
      setErrorMessage(message);
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge?.challengeId) {
      setErrorMessage("Please request an OTP first.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await verifyAdminLoginOtp({
        challengeId: challenge.challengeId,
        otp: otp.trim(),
      });
      establishSession(result);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message = err.response?.data?.error || "Unable to verify OTP";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setChallenge(null);
    setOtp("");
    setErrorMessage(null);
  };

  const useDevCredentials = () => {
    setIdentifier("admin@example.com");
    setPassword("admin123");
    setChannel("email");
    setChallenge(null);
    setOtp("");
    setErrorMessage(null);
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
        <form
          className="admin-card admin-auth-card"
          onSubmit={challenge ? handleVerifyOtp : handleRequestOtp}
        >
          <div className="admin-auth-header">
            <span className="admin-auth-eyebrow">
              {challenge ? "OTP verification" : "Welcome back"}
            </span>
            <h2>SCPD CMS Login</h2>
            <p>
              {challenge
                ? `Enter the OTP sent to your ${challenge.channel === "sms" ? "mobile" : "email"} (${challenge.destination || "registered contact"}).`
                : "Use your registered email/mobile and password to receive OTP."}
            </p>
          </div>

          {!challenge ? (
            <>
              {isDev ? (
                <div className="admin-login-help" style={{ marginBottom: 12 }}>
                  <span>Local dev login:</span>{" "}
                  <code>admin@example.com / admin123</code>{" "}
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={useDevCredentials}
                    style={{ marginLeft: 8 }}
                  >
                    Use these
                  </button>
                </div>
              ) : null}
              <label htmlFor="admin-identifier">Email or mobile number</label>
              <input
                id="admin-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
              <label>Receive OTP via</label>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="otp-channel"
                    value="email"
                    checked={channel === "email"}
                    onChange={() => setChannel("email")}
                  />
                  Email
                </label>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="otp-channel"
                    value="sms"
                    checked={channel === "sms"}
                    onChange={() => setChannel("sms")}
                  />
                  SMS
                </label>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="admin-otp">OTP</label>
              <input
                id="admin-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="one-time-code"
                required
              />
              <p className="admin-login-help" style={{ marginTop: 4 }}>
                Wrong channel or contact?{" "}
                <button
                  type="button"
                  className="btn secondary"
                  onClick={resetFlow}
                  style={{ marginLeft: 8 }}
                >
                  Start again
                </button>
              </p>
            </>
          )}

          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <button type="submit" className="btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : challenge
                ? "Verify OTP and sign in"
                : "Send OTP"}
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
