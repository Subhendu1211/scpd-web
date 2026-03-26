import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../models/db.js";

const DEFAULT_EXPIRY = "12h";

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function signupPublicUser({ fullName, email, phone, password }) {
  const client = await pool.connect();
  try {
    const normalizedEmail = sanitizeEmail(email);
    const existing = await client.query(
      `SELECT id FROM public_users WHERE lower(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );
    if (existing.rows.length) {
      const err = new Error("Email already registered");
      err.code = "EMAIL_IN_USE";
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await client.query(
      `INSERT INTO public_users (full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, created_at` ,
      [fullName.trim(), normalizedEmail, phone?.trim() || null, passwordHash]
    );

    const newUser = insert.rows[0];

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT secret is not configured");
    }

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: "public" },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY }
    );

    return {
      token,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        createdAt: newUser.created_at
      }
    };
  } finally {
    client.release();
  }
}

export async function authenticatePublicUser({ email, password }) {
  const client = await pool.connect();
  try {
    const normalizedEmail = sanitizeEmail(email);
    const { rows } = await client.query(
      `SELECT id, full_name, email, phone, password_hash
         FROM public_users
        WHERE lower(email) = $1
        LIMIT 1`,
      [normalizedEmail]
    );

    if (!rows.length) {
      return null;
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    await client.query(
      `UPDATE public_users
          SET last_login_at = now(), updated_at = now()
        WHERE id = $1`,
      [user.id]
    );

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT secret is not configured");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "public" },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY }
    );

    return {
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone
      }
    };
  } finally {
    client.release();
  }
}
