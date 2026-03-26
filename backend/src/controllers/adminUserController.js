import { validationResult } from "express-validator";
import { createAdminUser, listAdminUsers } from "../services/adminUserService.js";

export async function list(req, res) {
  const users = await listAdminUsers();
  return res.json({ data: users });
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const payload = { ...req.body };
    const user = await createAdminUser({
      email: payload.email,
      password: payload.password,
      role: payload.role,
      fullName: payload.fullName,
      phone: payload.phone,
      isActive: payload.isActive,
      createdBy: req.user?.id || null,
      ipAddress: req.ip
    });
    return res.status(201).json({ data: user });
  } catch (error) {
    const message = error.message || "Unable to create user";
    if (message.includes("already registered")) {
      return res.status(409).json({ error: message });
    }
    if (message.includes("superadmin")) {
      return res.status(403).json({ error: message });
    }
    return res.status(400).json({ error: message });
  }
}
