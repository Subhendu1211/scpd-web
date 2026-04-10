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
  ensureCmsMediaFileBytesColumn,
} from "./models/ensureSchema.js";
import { fetchMediaBinaryByFileName } from "./services/adminMediaService.js";

dotenv.config();

// Debug: print DB environment so we can verify which Postgres instance we're using
try {
  console.debug("DB env:", {
    DB_NAME: process.env.DB_NAME || process.env.PGDATABASE,
    DB_HOST: process.env.DB_HOST || process.env.PGHOST,
    DB_PORT: process.env.DB_PORT || process.env.PGPORT,
    DB_USER: process.env.DB_USER || process.env.PGUSER,
    DB_SSL: process.env.DB_SSL,
  });
} catch (e) {
  /* ignore */
}

const app = express();

// Trust the first reverse proxy (Nginx) so that express-rate-limit
// can correctly identify real client IPs via X-Forwarded-For.
app.set("trust proxy", 1);

const corsOriginsEnv = process.env.CORS_ORIGINS;
const corsOrigins = corsOriginsEnv
  ? corsOriginsEnv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  : null;

app.use(
  cors({
    origin: corsOrigins ?? true,
    credentials: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", apiRouter);
app.use("/api/admin", adminRouter);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// serve built frontend if copied to /public
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const configuredMediaMaxFileSize = Number(process.env.MEDIA_MAX_FILE_SIZE);
      if (Number.isFinite(configuredMediaMaxFileSize) && configuredMediaMaxFileSize > 0) {
        const maxMb = Math.round(configuredMediaMaxFileSize / (1024 * 1024));
        return res
          .status(413)
          .json({ error: `File too large. Maximum upload size is ${maxMb} MB.` });
      }
      return res
        .status(413)
        .json({ error: "File too large." });
    }
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

(async () => {
  await ensureBaseCmsSchema();
  await ensureCmsMediaCategoryConstraint();
  await ensureCmsMediaFileBytesColumn();
  await ensureCmsMediaCaptionTextColorColumn();
  app.listen(PORT, () =>
    console.log(`API listening on http://localhost:${PORT}`),
  );
})().catch((error) => {
  console.error("Unable to start API server", error);
  process.exit(1);
});
