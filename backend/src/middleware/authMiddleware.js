import jwt from "jsonwebtoken";

function normalizeRole(role) {
  if (!role) return null;
  return role.toString().trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

export function authenticateAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("Missing JWT secret");
    }
    const payload = jwt.verify(token, secret);
    req.user = {
      ...payload,
      role: normalizeRole(payload.role)
    };
    next();
  } catch (error) {
    if (error.message === "Missing JWT secret") {
      return res.status(500).json({ error: "Server misconfiguration" });
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdminRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userRole = normalizeRole(req.user.role);
    const allowed = roles.length ? roles.map(normalizeRole) : [];
    if (roles.length && !allowed.includes(userRole)) {
      // Temporary debug to trace role mismatches in lower envs.
      console.warn("role_guard_block", {
        path: req.originalUrl,
        role: userRole,
        allowedRoles: allowed
      });
      return res.status(403).json({
        error: "Insufficient permissions",
        detail: {
          role: userRole,
          allowedRoles: allowed
        }
      });
    }
    next();
  };
}
