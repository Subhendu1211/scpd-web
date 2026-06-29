import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "../models/db.js";
import {
  isGovtSmsConfigured,
  sendAdminOtp,
  sendPortalRegistrationNotification,
  verifyTwilioOtp,
} from "./notificationService.js";
import { validatePasswordPolicy } from "../utils/passwordPolicy.js";

const DEFAULT_EXPIRY = "12h";
const LOGIN_OTP_EXPIRY_MINUTES = Number(process.env.PUBLIC_LOGIN_OTP_EXPIRY_MINUTES || 10);
const MAX_LOGIN_OTP_ATTEMPTS = Number(process.env.PUBLIC_LOGIN_OTP_MAX_ATTEMPTS || 5);
const LOGIN_OTP_RESEND_COOLDOWN_SECONDS = Number(
  process.env.PUBLIC_LOGIN_OTP_RESEND_COOLDOWN_SECONDS || 60,
);
const LOGIN_OTP_RATE_WINDOW_SECONDS = Number(
  process.env.PUBLIC_LOGIN_OTP_RATE_WINDOW_SECONDS || 15 * 60,
);
const LOGIN_OTP_MAX_PER_WINDOW = Number(
  process.env.PUBLIC_LOGIN_OTP_MAX_PER_WINDOW || 5,
);

function sanitizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function maskDestination(value, channel) {
  if (!value) return "";
  if (channel === "sms") {
    const digits = String(value).replace(/\D+/g, "");
    if (digits.length <= 4) return "****";
    return `${"*".repeat(Math.max(digits.length - 4, 2))}${digits.slice(-4)}`;
  }
  const [local, domain] = String(value).split("@");
  if (!domain) return value;
  if (local.length <= 2) return `**@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function issuePublicToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: "public" },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY },
  );
}

async function ensurePublicLoginOtpTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public_login_otps (
      id TEXT PRIMARY KEY,
      public_user_id TEXT NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('email', 'sms')),
      destination TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_public_login_otps_user
      ON public_login_otps(public_user_id, created_at DESC);
  `);
}

function chooseLoginChannel(user, requestedChannel) {
  const desired = requestedChannel === "sms" || requestedChannel === "email"
    ? requestedChannel
    : user.phone ? "sms" : "email";
  if (desired === "sms" && user.phone) {
    return { channel: "sms", destination: user.phone };
  }
  if (user.email) {
    return { channel: "email", destination: user.email };
  }
  throw new Error("No valid email/phone destination found for OTP");
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function enforcePublicLoginOtpRateLimit(client, userId, destination) {
  const recent = await client.query(
    `SELECT created_at
       FROM public_login_otps
      WHERE public_user_id = $1
        AND destination = $2
        AND created_at >= now() - ($3::int * interval '1 second')
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, destination, LOGIN_OTP_RESEND_COOLDOWN_SECONDS],
  );
  if (recent.rows.length) {
    const error = new Error("Please wait before requesting another login OTP.");
    error.code = "OTP_RATE_LIMITED";
    throw error;
  }

  const countResult = await client.query(
    `SELECT count(*)::int AS count
       FROM public_login_otps
      WHERE public_user_id = $1
        AND destination = $2
        AND created_at >= now() - ($3::int * interval '1 second')`,
    [userId, destination, LOGIN_OTP_RATE_WINDOW_SECONDS],
  );
  if (Number(countResult.rows[0]?.count || 0) >= LOGIN_OTP_MAX_PER_WINDOW) {
    const error = new Error("Too many login OTP requests. Please try again later.");
    error.code = "OTP_RATE_LIMITED";
    throw error;
  }
}

export async function signupPublicUser({ fullName, email, phone, password }) {
  const passwordPolicyError = validatePasswordPolicy(password);
  if (passwordPolicyError) {
    throw new Error(passwordPolicyError);
  }

  const client = await pool.connect();
  try {
    const normalizedEmail = sanitizeEmail(email);
    const existing = await client.query(
      `SELECT id FROM public_users WHERE lower(email) = $1 LIMIT 1`,
      [normalizedEmail],
    );
    if (existing.rows.length) {
      const err = new Error("Email already registered");
      err.code = "EMAIL_IN_USE";
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUserId = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const insert = await client.query(
      `INSERT INTO public_users (id, full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, created_at`,
      [newUserId, fullName.trim(), normalizedEmail, phone?.trim() || null, passwordHash],
    );

    const newUser = insert.rows[0];
    const token = issuePublicToken(newUser);

    await sendPortalRegistrationNotification({
      email: newUser.email,
      phone: newUser.phone,
      fullName: newUser.full_name,
    }).catch((error) => {
      const msg = error?.message || String(error);
      console.warn("[PUBLIC_REGISTRATION_NOTIFICATION_FAILED]", msg);
    });

    return {
      token,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        createdAt: newUser.created_at,
      },
    };
  } finally {
    client.release();
  }
}

export async function authenticatePublicUser({ email, password, channel }) {
  const client = await pool.connect();
  try {
    const normalizedEmail = sanitizeEmail(email);
    const { rows } = await client.query(
      `SELECT id, full_name, email, phone, password_hash
         FROM public_users
        WHERE lower(email) = $1
        LIMIT 1`,
      [normalizedEmail],
    );

    if (!rows.length) {
      return null;
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    await ensurePublicLoginOtpTable(client);

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000);
    const delivery = chooseLoginChannel(user, channel);
    await enforcePublicLoginOtpRateLimit(client, user.id, delivery.destination);

    const challengeId = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

    await client.query(
      `UPDATE public_login_otps
          SET consumed_at = now()
        WHERE public_user_id = $1
          AND consumed_at IS NULL`,
      [user.id],
    );

    await client.query(
      `INSERT INTO public_login_otps (id, public_user_id, otp_hash, delivery_channel, destination, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [challengeId, user.id, otpHash, delivery.channel, delivery.destination, expiresAt],
    );

    await sendAdminOtp({
      channel: delivery.channel,
      destination: delivery.destination,
      code: otp,
      purpose: "public_login",
    });

    return {
      requiresOtp: true,
      challengeId,
      channel: delivery.channel,
      destination: maskDestination(delivery.destination, delivery.channel),
      message: `OTP sent to your ${delivery.channel === "sms" ? "mobile" : "email"}.`,
    };
  } finally {
    client.release();
  }
}

export async function verifyPublicUserLoginOtp({ challengeId, otp }) {
  const client = await pool.connect();
  try {
    await ensurePublicLoginOtpTable(client);
    const result = await client.query(
      `SELECT o.id, o.public_user_id, o.otp_hash, o.delivery_channel, o.destination,
              o.attempts, o.expires_at, o.consumed_at,
              u.full_name, u.email, u.phone
         FROM public_login_otps o
         JOIN public_users u ON u.id = o.public_user_id
        WHERE o.id = $1
        LIMIT 1`,
      [challengeId],
    );
    if (!result.rows.length) {
      return null;
    }

    const challenge = result.rows[0];
    if (challenge.consumed_at) return null;
    if (challenge.expires_at && new Date(challenge.expires_at).getTime() < Date.now()) return null;
    if (challenge.attempts >= MAX_LOGIN_OTP_ATTEMPTS) return null;

    let valid = await bcrypt.compare(String(otp || "").trim(), challenge.otp_hash);
    if (!valid && challenge.delivery_channel === "sms" && !isGovtSmsConfigured()) {
      valid = await verifyTwilioOtp({
        destination: challenge.destination,
        code: String(otp || "").trim(),
      });
    }

    if (!valid) {
      await client.query(
        `UPDATE public_login_otps
            SET attempts = attempts + 1,
                consumed_at = CASE WHEN attempts + 1 >= $2 THEN now() ELSE consumed_at END
          WHERE id = $1`,
        [challenge.id, MAX_LOGIN_OTP_ATTEMPTS],
      );
      return null;
    }

    await client.query(
      `UPDATE public_login_otps
          SET consumed_at = now()
        WHERE id = $1`,
      [challenge.id],
    );
    await client.query(
      `UPDATE public_users
          SET last_login_at = now(), updated_at = now()
        WHERE id = $1`,
      [challenge.public_user_id],
    );

    const token = issuePublicToken({ id: challenge.public_user_id, email: challenge.email });
    return {
      token,
      user: {
        id: challenge.public_user_id,
        fullName: challenge.full_name,
        email: challenge.email,
        phone: challenge.phone,
      },
    };
  } finally {
    client.release();
  }
}
