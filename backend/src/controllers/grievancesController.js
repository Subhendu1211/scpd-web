import { pool } from "../models/db.js";
export async function submit(req, res) {
  const { name, details } = req.body || {};
  if (!name || !details) return res.status(400).json({ error: "name and details required" });
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS grievances(id SERIAL PRIMARY KEY, name TEXT, details TEXT, created_at TIMESTAMP DEFAULT now())");
    await pool.query("INSERT INTO grievances(name, details) VALUES ($1,$2)", [name, details]);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to save grievance" });
  }
}