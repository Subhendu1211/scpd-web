import { pool } from "../models/db.js";
import { sendPortalComplaintNotification } from "../services/notificationService.js";
export async function submit(req, res) {
  const { name, details, email, phone } = req.body || {};
  if (!name || !details) return res.status(400).json({ error: "name and details required" });
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS grievances(id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, details TEXT, created_at TIMESTAMP DEFAULT now())",
    );
    await pool.query("ALTER TABLE grievances ADD COLUMN IF NOT EXISTS email TEXT");
    await pool.query("ALTER TABLE grievances ADD COLUMN IF NOT EXISTS phone TEXT");
    await pool.query(
      "INSERT INTO grievances(name, email, phone, details) VALUES ($1,$2,$3,$4)",
      [name, email || null, phone || null, details],
    );
    await sendPortalComplaintNotification({ email, phone, fullName: name }).catch((error) => {
      const msg = error?.message || String(error);
      console.warn("[PUBLIC_COMPLAINT_NOTIFICATION_FAILED]", msg);
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to save grievance" });
  }
}
