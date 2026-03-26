import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../models/db.js";
import { recordUserLog } from "./auditService.js";
import {
  isTwilioVerifyConfigured,
  sendPasswordResetOtp,
  verifyTwilioOtp,
} from "./notificationService.js";
import { ADMIN_ROLES } from "../constants/adminRoles.js";

function normalizeRoleString(role) {
  if (!role || typeof role !== "string") return role;
  return role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const DEFAULT_EXPIRY = "2h";
const OTP_EXPIRY_MINUTES = Number(
  process.env.ADMIN_RESET_OTP_EXPIRY_MINUTES || 10,
);
const MAX_RESET_ATTEMPTS = Number(process.env.ADMIN_RESET_MAX_ATTEMPTS || 5);

// Login lockout settings
const MAX_LOGIN_ATTEMPTS = Number(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || 5);
const LOGIN_LOCKOUT_MINUTES = Number(
  process.env.ADMIN_LOGIN_LOCKOUT_MINUTES || 15,
);

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

function sanitizePhone(phone) {
  if (!phone) {
    return null;
  }
  return phone.replace(/\D+/g, "").trim();
}

function maskDestination(value, channel) {
  if (!value) {
    return null;
  }
  if (channel === "sms") {
    const visible = value.slice(-4);
    return `${"*".repeat(Math.max(0, value.length - 4))}${visible}`;
  }
  const [local, domain] = value.split("@", 2);
  if (!domain) {
    return value;
  }
  if (local.length <= 2) {
    const head = local[0] || "*";
    return `${head}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function resolveDeliveryChannel(requestedChannel, user) {
  // Force email delivery; SMS is not configured. Fail fast if no email is on file.
  if (!user.email) {
    throw new Error("No email is configured for this user");
  }
  return { channel: "email", destination: user.email };
}

export async function authenticateAdminUser(email, password) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, email, password_hash, role, full_name, phone, is_active,
              failed_login_attempts, locked_until
       FROM admin_users
       WHERE email = $1`,
      [sanitizeEmail(email)],
    );

    if (!rows.length) {
      return null;
    }

    const user = rows[0];

    if (!user.is_active) {
      const error = new Error("Account disabled");
      error.code = "ACCOUNT_DISABLED";
      throw error;
    }

    // Check if account is locked
    if (
      user.locked_until &&
      new Date(user.locked_until).getTime() > Date.now()
    ) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      const error = new Error(
        `Account locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`,
      );
      error.code = "ACCOUNT_LOCKED";
      throw error;
    }

    // If lockout has expired, reset the counter
    if (
      user.locked_until &&
      new Date(user.locked_until).getTime() <= Date.now()
    ) {
      await client.query(
        `UPDATE admin_users
           SET failed_login_attempts = 0, locked_until = NULL, updated_at = now()
         WHERE id = $1`,
        [user.id],
      );
      user.failed_login_attempts = 0;
      user.locked_until = null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Lock account
        const lockUntil = new Date(
          Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000,
        );
        await client.query(
          `UPDATE admin_users
             SET failed_login_attempts = $1, locked_until = $2, updated_at = now()
           WHERE id = $3`,
          [newAttempts, lockUntil, user.id],
        );
        const error = new Error(
          `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in ${LOGIN_LOCKOUT_MINUTES} minutes.`,
        );
        error.code = "ACCOUNT_LOCKED";
        throw error;
      } else {
        // Increment failed attempts
        await client.query(
          `UPDATE admin_users
             SET failed_login_attempts = $1, updated_at = now()
           WHERE id = $2`,
          [newAttempts, user.id],
        );
      }
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT secret is not configured");
    }

    const normalizedRole = normalizeRoleString(user.role);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: normalizedRole },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY },
    );

    // Successful login — reset failed attempts and update last_login_at
    await client.query(
      `UPDATE admin_users
         SET last_login_at = now(),
             failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = now()
       WHERE id = $1`,
      [user.id],
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: normalizedRole,
        fullName: user.full_name,
        phone: user.phone,
      },
    };
  } finally {
    client.release();
  }
}

export async function initiatePasswordReset({
  email,
  phone,
  channel,
  ipAddress,
}) {
  const normalizedEmail = email ? sanitizeEmail(email) : null;
  const normalizedPhone = sanitizePhone(phone);

  if (!normalizedEmail && !normalizedPhone) {
    throw new Error("Email or phone is required");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const conditions = [];
    const params = [];
    if (normalizedEmail) {
      params.push(normalizedEmail);
      conditions.push(`email = $${params.length}`);
    }
    if (normalizedPhone) {
      params.push(normalizedPhone);
      conditions.push(`phone = $${params.length}`);
    }

    const lookup = await client.query(
      `SELECT id, email, phone, is_active
       FROM admin_users
       WHERE ${conditions.join(" OR ")}
       ORDER BY updated_at DESC
       LIMIT 1`,
      params,
    );

    if (!lookup.rows.length || !lookup.rows[0].is_active) {
      await client.query("ROLLBACK");
      return null;
    }

    const user = lookup.rows[0];
    const { channel: deliveryChannel, destination } = resolveDeliveryChannel(
      channel,
      user,
    );

    const otp = generateOtp();
    const hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const resetInsert = await client.query(
      `INSERT INTO admin_password_resets
         (admin_user_id, otp_hash, delivery_channel, destination, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user.id, hash, deliveryChannel, destination, expiresAt],
    );

    await sendPasswordResetOtp({
      channel: deliveryChannel,
      destination,
      code: otp,
    });

    await recordUserLog({
      client,
      userId: user.id,
      action: "admin_user.password_reset.request",
      targetType: "admin_user",
      targetId: user.id,
      details: {
        channel: deliveryChannel,
        destination: maskDestination(destination, deliveryChannel),
        resetId: resetInsert.rows[0].id,
      },
      ipAddress: ipAddress || null,
    });

    await client.query("COMMIT");
    return { channel: deliveryChannel, destination };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPasswordWithOtp({
  email,
  otp,
  newPassword,
  ipAddress,
}) {
  if (!email || !otp || !newPassword) {
    throw new Error("Missing required fields");
  }

  const normalizedEmail = sanitizeEmail(email);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT id, email
       FROM admin_users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    if (!userResult.rows.length) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or expired OTP");
    }

    const user = userResult.rows[0];

    const resetResult = await client.query(
      `SELECT id, otp_hash, expires_at, consumed_at, attempts, delivery_channel, destination
       FROM admin_password_resets
       WHERE admin_user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id],
    );

    if (!resetResult.rows.length) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or expired OTP");
    }

    const reset = resetResult.rows[0];

    if (reset.consumed_at) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or expired OTP");
    }

    if (reset.expires_at && new Date(reset.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or expired OTP");
    }

    if (reset.attempts >= MAX_RESET_ATTEMPTS) {
      await client.query("ROLLBACK");
      throw new Error("OTP locked. Please request a new code.");
    }

    let matches = false;
    if (
      reset.delivery_channel === "sms" &&
      reset.destination &&
      isTwilioVerifyConfigured()
    ) {
      matches = await verifyTwilioOtp({
        destination: reset.destination,
        code: otp,
      });
    } else {
      matches = await bcrypt.compare(otp, reset.otp_hash);
    }
    if (!matches) {
      await client.query(
        `UPDATE admin_password_resets
           SET attempts = attempts + 1,
               consumed_at = CASE WHEN attempts + 1 >= $2 THEN now() ELSE consumed_at END
         WHERE id = $1`,
        [reset.id, MAX_RESET_ATTEMPTS],
      );
      await client.query("COMMIT");
      return { success: false, reason: "invalid_otp" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client.query(
      `UPDATE admin_users
         SET password_hash = $1,
             updated_at = now()
       WHERE id = $2`,
      [hashedPassword, user.id],
    );

    await client.query(
      `UPDATE admin_password_resets
         SET consumed_at = now()
       WHERE id = $1`,
      [reset.id],
    );

    await recordUserLog({
      client,
      userId: user.id,
      action: "admin_user.password_reset.complete",
      targetType: "admin_user",
      targetId: user.id,
      details: null,
      ipAddress: ipAddress || null,
    });

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function isValidAdminRole(role) {
  return !!role && ADMIN_ROLES.includes(role);
}
