import { validationResult } from "express-validator";
import {
  authenticatePublicUser,
  signupPublicUser,
  verifyPublicUserLoginOtp,
} from "../services/userAuthService.js";

export async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, email, phone, password } = req.body;
  try {
    const result = await signupPublicUser({ fullName, email, phone, password });
    return res.status(201).json(result);
  } catch (err) {
    if (err.code === "EMAIL_IN_USE") {
      return res.status(409).json({ error: "Email already registered" });
    }
    if (/^Password must|^Password is too common/.test(err.message || "")) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Unable to create account" });
  }
}

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, channel } = req.body;
  try {
    const result = await authenticatePublicUser({ email, password, channel });
    if (!result) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json(result);
  } catch (err) {
    if (err.code === "OTP_RATE_LIMITED") {
      return res.status(429).json({ error: err.message });
    }
    return res.status(500).json({ error: "Unable to authenticate" });
  }
}

export async function verifyLoginOtp(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { challengeId, otp } = req.body;
  try {
    const result = await verifyPublicUserLoginOtp({ challengeId, otp });
    if (!result) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }
    return res.json(result);
  } catch (_err) {
    return res.status(500).json({ error: "Unable to verify OTP" });
  }
}
