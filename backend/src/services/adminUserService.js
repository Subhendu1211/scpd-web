import bcrypt from "bcrypt";
import { pool } from "../models/db.js";
import { recordUserLog } from "./auditService.js";
import { ADMIN_ROLES, DEFAULT_ADMIN_ROLE } from "../constants/adminRoles.js";

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

function sanitizePhone(phone) {
  if (!phone) {
    return null;
  }
  return phone.replace(/\D+/g, "").trim();
}

function normalizeRole(role) {
  if (!role) {
    return DEFAULT_ADMIN_ROLE;
  }
  const lower = role.toLowerCase();
  return ADMIN_ROLES.includes(lower) ? lower : DEFAULT_ADMIN_ROLE;
}

function toAdminUserDto(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at
  };
}

export async function listAdminUsers() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, email, role, full_name, phone, is_active, last_login_at, created_at
       FROM admin_users
       ORDER BY created_at DESC`
    );
    return rows.map(toAdminUserDto);
  } finally {
    client.release();
  }
}

export async function createAdminUser({
  email,
  password,
  role,
  fullName = null,
  phone = null,
  isActive = true,
  createdBy = null,
  ipAddress = null
}) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const normalizedEmail = sanitizeEmail(email);
  const normalizedPhone = sanitizePhone(phone);
  const resolvedRole = normalizeRole(role);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (createdBy) {
      const creatorResult = await client.query(
        `SELECT role FROM admin_users WHERE id = $1`,
        [createdBy]
      );
      const creatorRole = creatorResult.rows[0]?.role || null;
      if (!creatorRole) {
        throw new Error("Requesting user not found");
      }
      if (resolvedRole === "superadmin" && creatorRole !== "superadmin") {
        throw new Error("Only a superadmin can assign the superadmin role");
      }
    }

    const hash = await bcrypt.hash(password, 10);

    const insert = await client.query(
      `INSERT INTO admin_users (email, password_hash, role, full_name, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, full_name, phone, is_active, last_login_at, created_at`,
      [normalizedEmail, hash, resolvedRole, fullName || null, normalizedPhone, isActive !== false]
    );

    const user = insert.rows[0];

    await recordUserLog({
      client,
      userId: createdBy,
      action: "admin_user.create",
      targetType: "admin_user",
      targetId: user.id,
      details: {
        role: user.role,
        email: user.email,
        phone: user.phone,
        isActive: user.is_active
      },
      ipAddress: ipAddress || null
    });

    await client.query("COMMIT");

    return toAdminUserDto(user);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      if (error.constraint === "admin_users_email_key") {
        throw new Error("Email is already registered");
      }
      if (error.constraint === "idx_admin_users_phone") {
        throw new Error("Phone number is already registered");
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
