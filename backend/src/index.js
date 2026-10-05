import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./routes/index.js";
import adminRouter from "./routes/adminRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import {
  ensureBaseCmsSchema,
  ensureCmsMediaCaptionTextColorColumn,
  ensureCmsMediaCategoryConstraint,
  ensureCmsMediaFileChunksTable,
  ensureCmsMediaFileBytesColumn,
} from "./models/ensureSchema.js";
import { checkDbHealth } from "./models/db.js";
import { fetchMediaBinaryByFileName } from "./services/adminMediaService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isTruthy(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

const shouldLoadDotenv =
  process.env.NODE_ENV !== "production" ||
  isTruthy(process.env.LOAD_DOTENV_IN_PRODUCTION);
if (shouldLoadDotenv) {
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
}

if (process.env.NODE_ENV === "production") {
  const jwtSecret = String(process.env.JWT_SECRET || "");
  if (jwtSecret.length < 32 || /^(change[-_ ]?me|secret|password)/i.test(jwtSecret)) {
    throw new Error("JWT_SECRET must be a unique secret of at least 32 characters in production.");
  }
}

const app = express();
let startupReady = false;

app.disable("x-powered-by");

// Trust the first reverse proxy (Caddy in the combined production stack) so that express-rate-limit
// can correctly identify real client IPs via X-Forwarded-For.
app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const forwardedProto = req
    .header("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const isHttps = req.secure || forwardedProto === "https";
  if (isHttps) {
    return next();
  }

  if (req.method === "GET" || req.method === "HEAD") {
    const host = req.header("host");
    if (host) {
      return res.redirect(308, `https://${host}${req.originalUrl}`);
    }
  }

  return res.status(426).json({ error: "HTTPS is required" });
});

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' https://platform.twitter.com https://translate.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https:",
      "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://www.facebook.com https://platform.twitter.com https://www.instagram.com",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  next();
});

const corsOriginsEnv = process.env.CORS_ORIGINS;
const corsOrigins = corsOriginsEnv
  ? corsOriginsEnv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  : null;

app.use(cors((req, callback) => {
  const origin = req.header("origin");
  if (!origin) return callback(null, { origin: false });

  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.header("host");
  const requestOrigin = host ? `${forwardedProto || req.protocol}://${host}` : null;
  const allowedByConfig = corsOrigins?.includes(origin) ||
    (process.env.NODE_ENV !== "production" && corsOrigins?.includes("*"));
  const allowed = origin === requestOrigin || allowedByConfig;

  callback(null, { origin: allowed ? origin : false, credentials: false });
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb", parameterLimit: 1000 }));

app.get("/api/health", async (_req, res) => {
  if (!startupReady) {
    return res.status(503).json({ ok: false });
  }
  try {
    await checkDbHealth();
    return res.json({ ok: true });
  } catch (error) {
    console.error("Health check DB error:", error?.message || error);
    return res.status(503).json({ ok: false });
  }
});
app.use("/api", apiRouter);
app.use("/api/admin", adminRouter);

const swaggerDocsEnabled =
  process.env.NODE_ENV !== "production" ||
  isTruthy(process.env.ENABLE_SWAGGER_DOCS);
if (swaggerDocsEnabled) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// serve built frontend if copied to /public
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Fallback: if a media file is missing on disk, serve it from DB.
// This keeps existing URLs working: /uploads/media/<file_name>
app.get("/uploads/media/:fileName", async (req, res) => {
  const { fileName } = req.params;
  try {
    const binary = await fetchMediaBinaryByFileName(fileName);
    if (!binary) {
      return res.status(404).json({ error: "Media not found" });
    }
    res.setHeader(
      "Content-Type",
      binary.mimeType || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(binary.fileBytes);
  } catch (error) {
    console.warn("Unable to serve media fallback from DB", error);
    return res.status(500).json({ error: "Unable to fetch media" });
  }
});

// SPA fallback for frontend routes on production host (e.g. /events/workshops-awareness).
// Keep API and uploads routes out of this fallback.
app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (_req, res, next) => {
  const indexPath = path.join(__dirname, "..", "public", "index.html");
  if (!indexPath) return next();
  return res.sendFile(indexPath, (err) => {
    if (err) next(err);
  });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const configuredMediaMaxFileSize = Number(process.env.MEDIA_MAX_FILE_SIZE);
      const maxBytes = Number.isFinite(configuredMediaMaxFileSize) && configuredMediaMaxFileSize > 0
        ? Math.min(configuredMediaMaxFileSize, 100 * 1024 * 1024)
        : 100 * 1024 * 1024;
      const maxMb = Math.ceil(maxBytes / (1024 * 1024));
      return res.status(413).json({ error: `File too large. Maximum upload size is ${maxMb} MB.` });
    }
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`Received ${signal}; closing HTTP server and database pool.`);
  server.close(async (error) => {
    if (error) {
      console.error("HTTP server shutdown failed:", error.message);
      process.exitCode = 1;
    }
    try {
      const { pool } = await import("./models/db.js");
      await pool.end();
    } catch (poolError) {
      console.error("Database pool shutdown failed:", poolError?.message || poolError);
      process.exitCode = 1;
    }
  });
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

// Run schema/bootstrap tasks in background.
// In cloud environments, hard-failing process startup causes generic App Service
// "Application Error" pages. We keep the server online and log bootstrap issues.
(async () => {
  try {
    await ensureBaseCmsSchema();
    await ensureCmsMediaCategoryConstraint();
    await ensureCmsMediaFileBytesColumn();
    await ensureCmsMediaFileChunksTable();
    await ensureCmsMediaCaptionTextColorColumn();
    startupReady = true;
  } catch (error) {
    console.error("Startup bootstrap warning (server still running):", error);
  }
})();
