import bcrypt from "bcrypt";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const { Pool } = pg;
const p = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
  user: process.env.DB_USER || process.env.PGUSER || "postgres",
  password: process.env.DB_PASS || process.env.PGPASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.PGDATABASE || "scpd_cms",
  ssl:
    String(process.env.DB_SSL || "")
      .trim()
      .toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : false,
});

const ALLOWED_ROLES = new Set([
  "superadmin",
  "admin",
  "author",
  "department_reviewer",
  "editor",
  "publishing_officer",
]);

function randomPassword() {
  return crypto.randomBytes(12).toString("base64url");
}

function normalizeRole(value) {
  return String(value || "superadmin")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "").trim();
  return digits || null;
}

async function main() {
  const email = String(process.env.ADMIN_RESET_EMAIL || "admin@example.com")
    .trim()
    .toLowerCase();
  const password =
    process.env.ADMIN_RESET_PASSWORD && process.env.ADMIN_RESET_PASSWORD.trim()
      ? process.env.ADMIN_RESET_PASSWORD.trim()
      : randomPassword();
  const fullName = String(process.env.ADMIN_RESET_FULL_NAME || "SCPD Admin")
    .trim();
  const role = normalizeRole(process.env.ADMIN_RESET_ROLE || "superadmin");
  const phone = normalizePhone(process.env.ADMIN_RESET_PHONE);
  const isActive = String(process.env.ADMIN_RESET_ACTIVE || "true")
    .trim()
    .toLowerCase();

  if (!email.includes("@")) {
    throw new Error("ADMIN_RESET_EMAIL must be a valid email address.");
  }

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(
      `Invalid ADMIN_RESET_ROLE: ${role}. Allowed: ${Array.from(ALLOWED_ROLES).join(", ")}`,
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_RESET_PASSWORD must be at least 8 characters.");
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await p.query(
      `INSERT INTO admin_users (email, password_hash, role, full_name, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone,
           is_active = EXCLUDED.is_active,
           updated_at = now()
       RETURNING id, email, role, is_active, phone`,
      [
        email,
        hash,
        role,
        fullName,
        phone,
        !["0", "false", "no", "off"].includes(isActive),
      ],
    );
    const row = result.rows[0];
    console.log("Admin account upserted successfully:");
    console.log(
      JSON.stringify(
        {
          id: row.id,
          email: row.email,
          role: row.role,
          is_active: row.is_active,
          phone: row.phone,
          password,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await p.end();
  }
}

main();
