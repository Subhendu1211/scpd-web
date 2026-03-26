import { validationResult } from "express-validator";
import { pool } from "../models/db.js";

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    createdAt: row.created_at,
  };
}

async function ensureFeedbackTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS feedback_submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}

export async function submit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const subject = String(req.body.subject || "").trim() || null;
  const message = String(req.body.message || "").trim();

  const client = await pool.connect();
  try {
    await ensureFeedbackTable(client);
    const { rows } = await client.query(
      `INSERT INTO feedback_submissions (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, subject, message, created_at`,
      [name, email, subject, message],
    );

    return res.status(201).json({
      message: "Feedback submitted successfully.",
      data: mapRow(rows[0]),
    });
  } finally {
    client.release();
  }
}

export async function adminList(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, 500));

  const client = await pool.connect();
  try {
    await ensureFeedbackTable(client);
    const { rows } = await client.query(
      `SELECT id, name, email, subject, message, created_at
         FROM feedback_submissions
        ORDER BY created_at DESC, id DESC
        LIMIT $1`,
      [limit],
    );

    return res.json({ data: rows.map(mapRow) });
  } finally {
    client.release();
  }
}
