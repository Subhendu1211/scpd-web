import { validationResult } from "express-validator";
import { authenticatePublicUser, signupPublicUser } from "../services/userAuthService.js";

export async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, email, phone, password } = req.body;
  try {
    const result = await signupPublicUser({ fullName, email, phone, password });
    return res.status(201).json(result);
  } catch (err) {
    if (err.code === "EMAIL_IN_USE") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Unable to create account" });
  }
}

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const result = await authenticatePublicUser({ email, password });
    if (!result) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json(result);
  } catch (_err) {
    return res.status(500).json({ error: "Unable to authenticate" });
  }
}
