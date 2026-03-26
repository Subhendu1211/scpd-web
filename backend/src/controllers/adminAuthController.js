import { validationResult } from "express-validator";
import {
  authenticateAdminUser,
  initiatePasswordReset,
  resetPasswordWithOtp,
} from "../services/adminAuthService.js";

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const result = await authenticateAdminUser(email, password);
    if (!result) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({ token: result.token, user: result.user });
  } catch (error) {
    if (error.code === "ACCOUNT_DISABLED") {
      return res
        .status(403)
        .json({
          error:
            "Your account has been disabled. Please contact an administrator.",
        });
    }
    if (error.code === "ACCOUNT_LOCKED") {
      return res.status(429).json({ error: error.message });
    }
    return res.status(500).json({ error: "Unable to authenticate" });
  }
}

export async function requestPasswordReset(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, phone, channel } = req.body;

  try {
    const result = await initiatePasswordReset({
      email,
      phone,
      channel,
      ipAddress: req.ip,
    });
    if (!result) {
      return res.json({ success: true });
    }
    return res.json({
      success: true,
      channel: result.channel,
      destination: maskDelivery(result.channel, result.destination),
    });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Unable to process request" });
  }
}

export async function resetPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, otp, password } = req.body;

  try {
    const result = await resetPasswordWithOtp({
      email,
      otp,
      newPassword: password,
      ipAddress: req.ip,
    });
    if (!result.success) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }
    return res.json({ success: true });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Unable to reset password" });
  }
}

function maskDelivery(channel, destination) {
  if (!destination) {
    return null;
  }
  if (channel === "sms") {
    const visible = destination.slice(-4);
    return `${"*".repeat(Math.max(0, destination.length - 4))}${visible}`;
  }
  const [local, domain] = destination.split("@", 2);
  if (!domain) {
    return destination;
  }
  if (local.length <= 2) {
    const head = local[0] || "*";
    return `${head}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
