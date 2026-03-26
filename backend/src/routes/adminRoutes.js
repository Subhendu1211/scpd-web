import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { body, param, query } from "express-validator";
import rateLimit from "express-rate-limit";

import * as adminAuthController from "../controllers/adminAuthController.js";
import * as adminMenuController from "../controllers/adminMenuController.js";
import * as adminOrgChartController from "../controllers/adminOrgChartController.js";
import * as adminPagesController from "../controllers/adminPagesController.js";
import * as adminMediaController from "../controllers/adminMediaController.js";
import * as adminMediaAlbumController from "../controllers/adminMediaAlbumController.js";
import * as adminUserController from "../controllers/adminUserController.js";
import * as adminAuditController from "../controllers/adminAuditController.js";
import * as adminSchemaController from "../controllers/adminSchemaController.js";
import * as newsController from "../controllers/newsController.js";
import * as whatsNewController from "../controllers/whatsNewController.js";
import * as adminSuccessStoriesController from "../controllers/adminSuccessStoriesController.js";
import * as feedbackController from "../controllers/feedbackController.js";
import {
  authenticateAdmin,
  requireAdminRole,
} from "../middleware/authMiddleware.js";
import { ADMIN_ROLES } from "../constants/adminRoles.js";

// IP-based rate limiter for login endpoints (max 10 attempts per 15 minutes)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
});

const WORKFLOW_STATUSES = [
  "draft",
  "department_review",
  "editor_review",
  "publishing_review",
  "published",
];

const PAGE_ACCESS_ROLES = [
  "superadmin",
  "admin",
  "author",
  "department_reviewer",
  "editor",
  "publishing_officer",
];

const MENU_ADMIN_ROLES = [
  "superadmin",
  "admin",
  "editor",
  "publishing_officer",
  "author", // allow authors to create navigation and org chart entries
  "department_reviewer",
];

const CONTENT_ADMIN_ROLES = [
  "superadmin",
  "admin",
  "editor",
  "publishing_officer",
  "author", // allow authors to create content; publish still restricted in services/controllers
  "department_reviewer",
];

const ADMIN_USER_MANAGER_ROLES = ["superadmin", "admin"];

const router = Router();
const configuredMediaMaxFileSize = Number(process.env.MEDIA_MAX_FILE_SIZE);
const hasUploadSizeLimit =
  Number.isFinite(configuredMediaMaxFileSize) && configuredMediaMaxFileSize > 0;

const tempUploadDir = path.resolve(process.cwd(), "uploads", "tmp");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}
const uploadConfig = {
  dest: tempUploadDir,
};
if (hasUploadSizeLimit) {
  uploadConfig.limits = {
    fileSize: configuredMediaMaxFileSize,
  };
}
const upload = multer(uploadConfig);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Authenticated admin endpoints
 */

router.post(
  "/auth/login",
  loginRateLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password is required"),
  ],
  adminAuthController.login,
);

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     tags: [Admin]
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT issued
 */

router.post(
  "/auth/forgot-password",
  [
    body("email")
      .optional({ values: "falsy" })
      .isEmail()
      .withMessage("Valid email is required"),
    body("phone")
      .optional({ values: "falsy" })
      .matches(/^[0-9+\-\s]{6,20}$/)
      .withMessage("Phone number must contain 6-20 digits"),
    body("channel")
      .optional({ values: "falsy" })
      .isIn(["email", "sms"])
      .withMessage("Channel must be email or sms"),
  ],
  adminAuthController.requestPasswordReset,
);

/**
 * @swagger
 * /admin/auth/forgot-password:
 *   post:
 *     tags: [Admin]
 *     summary: Request password reset OTP
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *     responses:
 *       200:
 *         description: OTP sent
 */

router.post(
  "/auth/reset-password",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp")
      .isLength({ min: 4, max: 10 })
      .withMessage("OTP must be between 4 and 10 characters"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  adminAuthController.resetPassword,
);

/**
 * @swagger
 * /admin/auth/reset-password:
 *   post:
 *     tags: [Admin]
 *     summary: Reset password with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, password]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset
 */

router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/menu-items:
 *   get:
 *     tags: [Admin]
 *     summary: List menu items
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Menu items
 */
router.get(
  "/menu-items",
  requireAdminRole(...MENU_ADMIN_ROLES),
  adminMenuController.list,
);
/**
 * @swagger
 * /admin/menu-items:
 *   post:
 *     tags: [Admin]
 *     summary: Create menu item
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Created
 */
router.post(
  "/menu-items",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [
    body("label").notEmpty().withMessage("Label is required"),
    body("slug")
      .matches(/^[a-z0-9-]+$/)
      .withMessage("Slug must be URL friendly"),
    body("path").matches(/^\//).withMessage("Path must start with '/'"),
    body("imagePath")
      .optional({ nullable: true })
      .isString()
      .withMessage("imagePath must be a string"),
  ],
  adminMenuController.create,
);
/**
 * @swagger
 * /admin/menu-items/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update menu item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  "/menu-items/:id",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [param("id").isInt()],
  adminMenuController.update,
);
/**
 * @swagger
 * /admin/menu-items/{id}/order:
 *   patch:
 *     tags: [Admin]
 *     summary: Update menu item order
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reordered
 */
router.patch(
  "/menu-items/:id/order",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [
    param("id").isInt(),
    body("sortOrder").isInt().optional({ values: "falsy" }),
  ],
  adminMenuController.reorder,
);
/**
 * @swagger
 * /admin/menu-items/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete menu item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/menu-items/:id",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [param("id").isInt()],
  adminMenuController.remove,
);

router.get(
  "/cms/org-chart",
  requireAdminRole(...MENU_ADMIN_ROLES),
  adminOrgChartController.list,
);

router.post(
  "/cms/org-chart",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [
    body("name").isString().isLength({ min: 2 }).trim(),
    body("title")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .isLength({ max: 200 }),
    body("department")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .isLength({ max: 200 }),
    body("email")
      .optional({ values: "falsy" })
      .isEmail()
      .withMessage("Valid email required"),
    body("phone")
      .optional({ values: "falsy" })
      .matches(/^[0-9+\-\s]{6,20}$/),
    body("photoUrl")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .isLength({ max: 500 }),
    body("parentId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
    body("sortOrder").optional({ values: "falsy" }).isInt().toInt(),
    body("isActive").optional().isBoolean().toBoolean(),
    body("metadata").optional().isObject(),
  ],
  adminOrgChartController.create,
);

router.patch(
  "/cms/org-chart/:id",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [
    param("id").isInt(),
    body("name").optional({ values: "falsy" }).isString().trim(),
    body("title")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .isLength({ max: 200 }),
    body("department")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .isLength({ max: 200 }),
    body("email")
      .optional({ values: "falsy" })
      .isEmail()
      .withMessage("Valid email required"),
    body("phone")
      .optional({ values: "falsy" })
      .matches(/^[0-9+\-\s]{6,20}$/),
    body("photoUrl")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .isLength({ max: 500 }),
    body("parentId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
    body("sortOrder").optional({ values: "falsy" }).isInt().toInt(),
    body("isActive").optional().isBoolean().toBoolean(),
    body("metadata").optional().isObject(),
  ],
  adminOrgChartController.update,
);

router.patch(
  "/cms/org-chart/:id/order",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [
    param("id").isInt(),
    body("parentId").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
    body("sortOrder").optional({ values: "falsy" }).isInt().toInt(),
  ],
  adminOrgChartController.reorder,
);

router.delete(
  "/cms/org-chart/:id",
  requireAdminRole(...MENU_ADMIN_ROLES),
  [param("id").isInt()],
  adminOrgChartController.remove,
);

router.get(
  "/pages",
  requireAdminRole(...PAGE_ACCESS_ROLES),
  [
    query("status")
      .optional({ values: "falsy" })
      .isString()
      .toLowerCase()
      .isIn(WORKFLOW_STATUSES)
      .withMessage("Invalid status filter"),
  ],
  adminPagesController.list,
);
/**
 * @swagger
 * /admin/pages:
 *   get:
 *     tags: [Admin]
 *     summary: List pages
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pages
 */
router.get(
  "/pages/:menuItemId",
  requireAdminRole(...PAGE_ACCESS_ROLES),
  [param("menuItemId").isInt()],
  adminPagesController.get,
);
/**
 * @swagger
 * /admin/pages/{menuItemId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get page by menu item id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Page
 */
router.post(
  "/pages",
  requireAdminRole(...PAGE_ACCESS_ROLES),
  [
    body("menuItemId")
      .optional({ values: "falsy" })
      .isInt({ gt: 0 })
      .withMessage("menuItemId must be a positive integer"),
    body("customPath")
      .optional({ values: "falsy" })
      .isString()
      .matches(/^\/?[a-zA-Z0-9\-_/]*$/)
      .withMessage("customPath contains invalid characters"),
    body("customLabel")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 160 })
      .withMessage("customLabel must be a string"),
    body("title")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Title is required"),
    body("status")
      .isString()
      .toLowerCase()
      .isIn(WORKFLOW_STATUSES)
      .withMessage("Invalid status"),
    body("fontFamily")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 120 })
      .withMessage("fontFamily must be a string"),
    body("fontColor")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 20 })
      .withMessage("fontColor must be a string"),
    body("backgroundColor")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 20 })
      .withMessage("backgroundColor must be a string"),
    body("pageLayout")
      .optional({ values: "falsy" })
      .isString()
      .isIn(["default", "narrow", "wide", "full"])
      .withMessage("Invalid pageLayout"),
    body("showInFooter")
      .optional()
      .isBoolean()
      .withMessage("showInFooter must be a boolean"),
    body("footerSection")
      .optional({ values: "falsy" })
      .isString()
      .toLowerCase()
      .isIn(["contact", "policies", "governance"])
      .withMessage("footerSection must be one of: contact, policies, governance"),
    body("footerLabel")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 160 })
      .withMessage("footerLabel must be a string"),
    body("footerOrder")
      .optional({ values: "falsy" })
      .isInt({ min: 0, max: 9999 })
      .withMessage("footerOrder must be an integer between 0 and 9999"),
    body("titleOr")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("titleOr must be a string"),
    body("summaryOr")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("summaryOr must be a string"),
    body("bodyOr")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("bodyOr must be a string"),
    body("publishedAt")
      .optional({ values: "falsy" })
      .isISO8601()
      .withMessage("publishedAt must be an ISO8601 date"),
    body("showPublishDate")
      .optional()
      .isBoolean()
      .withMessage("showPublishDate must be a boolean"),
    body("dynamicTableName")
      .optional({ values: "falsy" })
      .isString()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage(
        "Table name must start with a letter and use only letters, numbers, or underscores",
      ),
    body("attachmentsPaths")
      .optional({ nullable: true })
      .isArray()
      .withMessage("attachmentsPaths must be an array of strings"),
    body("attachmentsPaths.*")
      .optional({ nullable: true })
      .isString()
      .withMessage("Each attachment path must be a string"),
  ],
  adminPagesController.upsert,
);
/**
 * @swagger
 * /admin/pages:
 *   post:
 *     tags: [Admin]
 *     summary: Create or update a page
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Saved
 */

router.get(
  "/media",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  adminMediaController.list,
);

router.get(
  "/news",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  newsController.adminList,
);
router.post(
  "/news",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  upload.single("image"),
  [
    body("title")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage("Title is required"),
    body("body")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("Body must be a string"),
    body("publishedAt")
      .optional({ values: "falsy" })
      .isISO8601()
      .withMessage("publishedAt must be an ISO8601 date"),
    body("imageUrl")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 1000 })
      .withMessage("imageUrl must be a string"),
  ],
  newsController.create,
);

router.patch(
  "/news/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  upload.single("image"),
  [
    param("id").isInt(),
    body("title")
      .optional({ values: "falsy" })
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage("Title is required"),
    body("body")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("Body must be a string"),
    body("publishedAt")
      .optional({ values: "falsy" })
      .isISO8601()
      .withMessage("publishedAt must be an ISO8601 date"),
    body("imageUrl")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 1000 })
      .withMessage("imageUrl must be a string"),
    body("removeImage")
      .optional({ values: "falsy" })
      .isBoolean()
      .withMessage("removeImage must be true or false")
      .toBoolean(),
  ],
  newsController.update,
);
router.delete(
  "/news/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [param("id").isInt()],
  newsController.remove,
);

router.get(
  "/whats-new",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  whatsNewController.adminList,
);

router.get(
  "/feedback",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  feedbackController.adminList,
);
router.post(
  "/whats-new",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [
    body("title")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage("Title is required"),
    body("description")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 2000 })
      .withMessage("Description must be a string up to 2000 characters"),
    body("link")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 1000 })
      .withMessage("Link must be a string up to 1000 characters"),
    body("publishedAt")
      .optional({ values: "falsy" })
      .isISO8601()
      .withMessage("publishedAt must be an ISO8601 date"),
  ],
  whatsNewController.create,
);
router.delete(
  "/whats-new/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [param("id").isInt()],
  whatsNewController.remove,
);
/**
 * @swagger
 * /admin/media:
 *   get:
 *     tags: [Admin]
 *     summary: List media
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Media list
 */
router.post(
  "/media",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  upload.single("file"),
  body("category")
    .customSanitizer((value) => {
      if (!value || typeof value !== "string") return value;
      const map = {
        "Hero Carousel": "carousel",
        "hero carousel": "carousel",
        "Photo Gallery": "photo",
        "photo gallery": "photo",
        "Video Gallery": "video",
        "video gallery": "video",
        "Newspaper Clipping": "newspaper",
        "newspaper clipping": "newspaper",
        "Audio Clipping": "audio",
        "audio clipping": "audio",
      };
      return map[value] || value;
    })
    .isIn(["photo", "video", "newspaper", "audio", "carousel"])
    .withMessage("Category is required"),
  body("altText")
    .optional({ values: "falsy" })
    .isLength({ max: 240 })
    .withMessage("Alt text must be 240 characters or fewer"),
  body("captionTextColor")
    .optional({ values: "falsy" })
    .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .withMessage("Caption text color must be a hex color like #ffffff"),
  body("albumId")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Album must be a valid identifier"),
  adminMediaController.upload,
);
/**
 * @swagger
 * /admin/media:
 *   post:
 *     tags: [Admin]
 *     summary: Upload media
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Uploaded
 */
router.post(
  "/media/bulk",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  upload.array("files", 50),
  body("category")
    .customSanitizer((value) => {
      if (!value || typeof value !== "string") return value;
      const map = {
        "Hero Carousel": "carousel",
        "hero carousel": "carousel",
        "Photo Gallery": "photo",
        "photo gallery": "photo",
        "Video Gallery": "video",
        "video gallery": "video",
        "Newspaper Clipping": "newspaper",
        "newspaper clipping": "newspaper",
        "Audio Clipping": "audio",
        "audio clipping": "audio",
      };
      return map[value] || value;
    })
    .isIn(["photo", "video", "newspaper", "audio", "carousel"])
    .withMessage("Category is required"),
  body("captionTextColor")
    .optional({ values: "falsy" })
    .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .withMessage("Caption text color must be a hex color like #ffffff"),
  body("albumId")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Album must be a valid identifier"),
  adminMediaController.uploadBulk,
);

router.delete(
  "/media/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [param("id").isInt()],
  adminMediaController.remove,
);
/**
 * @swagger
 * /admin/media/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete media
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */
router.patch(
  "/media/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [
    param("id").isInt(),
    body("altText")
      .optional()
      .isLength({ max: 240 })
      .withMessage("Alt text must be 240 characters or fewer"),
    body("captionTextColor")
      .optional({ values: "falsy" })
      .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .withMessage("Caption text color must be a hex color like #ffffff"),
    body("albumId")
      .optional({ values: "falsy" })
      .isInt({ min: 1 })
      .withMessage("Album must be a valid identifier"),
    body("category")
      .optional()
      .isIn(["photo", "video", "newspaper", "audio", "carousel"])
      .withMessage("Invalid category"),
  ],
  adminMediaController.update,
);
/**
 * @swagger
 * /admin/media/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update media metadata
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated
 */

router.get(
  "/media-albums",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  adminMediaAlbumController.list,
);
/**
 * @swagger
 * /admin/media-albums:
 *   get:
 *     tags: [Admin]
 *     summary: List media albums
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Albums
 */
router.post(
  "/media-albums",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [
    body("name").notEmpty().withMessage("Album name is required"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be 500 characters or fewer"),
    body("sortOrder")
      .optional()
      .isInt()
      .withMessage("Sort order must be a number"),
    body("coverMediaId")
      .optional({ values: "falsy" })
      .isInt({ min: 1 })
      .withMessage("Cover media must be a valid identifier"),
  ],
  adminMediaAlbumController.create,
);
/**
 * @swagger
 * /admin/media-albums:
 *   post:
 *     tags: [Admin]
 *     summary: Create media album
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Created
 */
router.patch(
  "/media-albums/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [
    param("id").isInt(),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Album name cannot be empty"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be 500 characters or fewer"),
    body("sortOrder")
      .optional()
      .isInt()
      .withMessage("Sort order must be a number"),
    body("coverMediaId")
      .optional({ values: "falsy" })
      .isInt({ min: 1 })
      .withMessage("Cover media must be a valid identifier"),
  ],
  adminMediaAlbumController.update,
);
/**
 * @swagger
 * /admin/media-albums/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update media album
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated
 */
router.delete(
  "/media-albums/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [param("id").isInt()],
  adminMediaAlbumController.remove,
);
/**
 * @swagger
 * /admin/media-albums/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete media album
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */

router.get(
  "/users",
  requireAdminRole(...ADMIN_USER_MANAGER_ROLES),
  adminUserController.list,
);
/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Users
 */
router.post(
  "/users",
  requireAdminRole(...ADMIN_USER_MANAGER_ROLES),
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("role")
      .optional({ values: "falsy" })
      .isString()
      .toLowerCase()
      .isIn(ADMIN_ROLES)
      .withMessage("Invalid role"),
    body("fullName")
      .optional({ values: "falsy" })
      .isLength({ max: 120 })
      .withMessage("Name must be 120 characters or fewer"),
    body("phone")
      .optional({ values: "falsy" })
      .matches(/^[0-9]{6,15}$/)
      .withMessage("Phone number must be 6-15 digits"),
    body("isActive").optional().isBoolean().toBoolean(),
  ],
  adminUserController.create,
);
/**
 * @swagger
 * /admin/users:
 *   post:
 *     tags: [Admin]
 *     summary: Create user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Created
 */

router.get(
  "/logs",
  requireAdminRole(...ADMIN_USER_MANAGER_ROLES),
  [
    query("scope")
      .optional({ values: "falsy" })
      .isString()
      .toLowerCase()
      .isIn(["user", "workflow"])
      .withMessage("Invalid log scope"),
    query("page")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 1000 })
      .withMessage("Page must be a positive integer"),
    query("pageSize")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 100 })
      .withMessage("pageSize must be between 1 and 100"),
  ],
  adminAuditController.list,
);
/**
 * @swagger
 * /admin/logs:
 *   get:
 *     tags: [Admin]
 *     summary: List logs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Logs
 */

router.post(
  "/cms/tables",
  requireAdminRole("superadmin", "admin"),
  [
    body("tableName")
      .isString()
      .trim()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage(
        "Table name must start with a letter and use only letters, numbers, or underscores",
      ),
    body("columns")
      .isArray({ min: 1, max: 50 })
      .withMessage("Provide between 1 and 50 columns"),
    body("columns.*.name")
      .isString()
      .trim()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage(
        "Column names must start with a letter and use only letters, numbers, or underscores",
      ),
    body("columns.*.type")
      .isString()
      .trim()
      .withMessage("Column type is required"),
    body("columns.*.nullable").optional().isBoolean().toBoolean(),
    body("columns.*.isPrimaryKey").optional().isBoolean().toBoolean(),
    body("columns.*.length")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 255 })
      .toInt(),
    body("columns.*.precision")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 38 })
      .toInt(),
    body("columns.*.scale")
      .optional({ values: "falsy" })
      .isInt({ min: 0, max: 38 })
      .toInt(),
    body("columns.*.defaultValue")
      .optional({ values: "falsy" })
      .isString()
      .trim(),
  ],
  adminSchemaController.createTable,
);
/**
 * @swagger
 * /admin/cms/tables:
 *   post:
 *     tags: [Admin]
 *     summary: Create CMS table
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Created
 */

router.get(
  "/cms/tables",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  adminSchemaController.listTables,
);
/**
 * @swagger
 * /admin/cms/tables:
 *   get:
 *     tags: [Admin]
 *     summary: List CMS tables
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tables
 */

router.post(
  "/cms/tables/:tableName/columns",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    body("column").isObject().withMessage("column object is required"),
    body("column.name")
      .isString()
      .trim()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage(
        "Column name must start with a letter and use only letters, numbers, or underscores",
      ),
    body("column.type")
      .isString()
      .trim()
      .withMessage("Column type is required"),
    body("column.nullable").optional().isBoolean().toBoolean(),
    body("column.isPrimaryKey").optional().isBoolean().toBoolean(),
    body("column.length")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 255 })
      .toInt(),
    body("column.precision")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 38 })
      .toInt(),
    body("column.scale")
      .optional({ values: "falsy" })
      .isInt({ min: 0, max: 38 })
      .toInt(),
    body("column.defaultValue").optional({ values: "falsy" }).isString().trim(),
  ],
  adminSchemaController.addColumn,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/columns:
 *   post:
 *     tags: [Admin]
 *     summary: Add column to table
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Column added
 */

router.delete(
  "/cms/tables/:tableName/columns",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    body("columnName")
      .isString()
      .trim()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage(
        "Column name must start with a letter and use only letters, numbers, or underscores",
      ),
  ],
  adminSchemaController.dropColumn,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/columns:
 *   delete:
 *     tags: [Admin]
 *     summary: Drop column from table
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Column dropped
 */

router.get(
  "/cms/tables/:tableName",
  requireAdminRole("superadmin", "admin"),
  [param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)],
  adminSchemaController.getTable,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}:
 *   get:
 *     tags: [Admin]
 *     summary: Get table definition
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table definition
 */

router.patch(
  "/cms/tables/:tableName/settings",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    body("displayName")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 120 }),
    body("exposeFrontend").optional().isBoolean().toBoolean(),
    body("headerBgColor")
      .optional({ values: "falsy" })
      .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .withMessage("headerBgColor must be a hex color like #1b6dd1"),
    body("headerTextColor")
      .optional({ values: "falsy" })
      .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .withMessage("headerTextColor must be a hex color like #ffffff"),
    body("bodyTextColor")
      .optional({ values: "falsy" })
      .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .withMessage("bodyTextColor must be a hex color like #1b2f5b"),
  ],
  adminSchemaController.updateTableSettings,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/settings:
 *   patch:
 *     tags: [Admin]
 *     summary: Update table settings
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Settings updated
 */

router.post(
  "/cms/tables/:tableName/rows",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    body("row").isObject().withMessage("row object is required"),
  ],
  adminSchemaController.insertRow,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/rows:
 *   post:
 *     tags: [Admin]
 *     summary: Insert table row
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Row inserted
 */

router.get(
  "/cms/tables/:tableName/rows",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    query("limit")
      .optional({ values: "falsy" })
      .isInt({ min: 1, max: 500 })
      .toInt(),
  ],
  adminSchemaController.listRows,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/rows:
 *   get:
 *     tags: [Admin]
 *     summary: List table rows
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rows
 */

router.patch(
  "/cms/tables/:tableName/rows",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    body("keys")
      .isObject()
      .withMessage("keys object with primary key values is required"),
    body("changes").isObject().withMessage("changes object is required"),
  ],
  adminSchemaController.updateRow,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/rows:
 *   patch:
 *     tags: [Admin]
 *     summary: Update table row
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Row updated
 */

router.delete(
  "/cms/tables/:tableName/rows",
  requireAdminRole("superadmin", "admin"),
  [
    param("tableName").matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    body("keys")
      .isObject()
      .withMessage("keys object with primary key values is required"),
  ],
  adminSchemaController.deleteRow,
);
/**
 * @swagger
 * /admin/cms/tables/{tableName}/rows:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete table row
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Row deleted
 */

router.post(
  "/cms/uploads",
  requireAdminRole("superadmin", "admin"),
  upload.single("file"),
  adminSchemaController.uploadFile,
);
/**
 * @swagger
 * /admin/cms/uploads:
 *   post:
 *     tags: [Admin]
 *     summary: Upload CMS file
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Uploaded
 */

// ---- Success Stories (year-wise uploads) ----

router.get(
  "/success-stories",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  adminSuccessStoriesController.list,
);

router.get(
  "/success-stories/years",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  adminSuccessStoriesController.years,
);

router.post(
  "/success-stories",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  upload.single("file"),
  [
    body("year")
      .isInt({ min: 1900, max: 2100 })
      .withMessage("Year must be between 1900 and 2100"),
    body("altText")
      .optional({ values: "falsy" })
      .isLength({ max: 240 })
      .withMessage("Alt text must be 240 characters or fewer"),
  ],
  adminSuccessStoriesController.upload,
);

router.delete(
  "/success-stories/:id",
  requireAdminRole(...CONTENT_ADMIN_ROLES),
  [param("id").isInt()],
  adminSuccessStoriesController.remove,
);

export default router;
