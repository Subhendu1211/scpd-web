import { Router } from "express";
import * as newsController from "../controllers/newsController.js";
import * as grievancesController from "../controllers/grievancesController.js";
import * as cmsController from "../controllers/cmsController.js";
import * as whatsNewController from "../controllers/whatsNewController.js";
import * as userAuthController from "../controllers/userAuthController.js";
import * as feedbackController from "../controllers/feedbackController.js";
import { listSuccessStories } from "../services/adminSuccessStoriesService.js";
import { body } from "express-validator";

// Simple fallback captions for the hero carousel when CMS content is absent
const SUCCESS_STORY_CAPTIONS = [
  "Empowering persons with disabilities through inclusive governance.",
  "Ensuring equal opportunities and social justice for all.",
  "Building an accessible and barrier-free Odisha.",
  "Supporting dignity, rights, and independence for every citizen.",
  "Transforming lives through welfare and empowerment initiatives.",
];

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Publicly accessible endpoints
 */

/**
 * @swagger
 * /news:
 *   get:
 *     tags: [Public]
 *     summary: List news items
 *     responses:
 *       200:
 *         description: Array of news entries
 */
router.get("/news", newsController.list);
router.get("/news/:id", newsController.getById);
router.get("/whats-new", whatsNewController.list);

// Hero captions fallback (avoids 404s when CMS data is not yet seeded)
router.get("/v1/success-stories-caption", (_req, res) => {
  res.json({ summaries: SUCCESS_STORY_CAPTIONS });
});

/**
 * @swagger
 * /news:
 *   post:
 *     tags: [Public]
 *     summary: Create a new news item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: News item created
 */
router.post("/news", newsController.create);

/**
 * @swagger
 * /news/:id:
 *   delete:
 *     tags: [Public]
 *     summary: Delete a news item
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: News item deleted
 */
router.delete("/news/:id", newsController.remove);

/**
 * @swagger
 * /grievances:
 *   post:
 *     tags: [Public]
 *     summary: Submit a grievance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Grievance submitted
 */
router.post("/grievances", grievancesController.submit);

router.post(
  "/feedback",
  [
    body("name")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("subject")
      .optional({ values: "falsy" })
      .isString()
      .isLength({ max: 250 })
      .withMessage("Subject must be up to 250 characters"),
    body("message")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 5000 })
      .withMessage("Message is required"),
  ],
  feedbackController.submit,
);

/**
 * @swagger
 * /cms/navigation:
 *   get:
 *     tags: [Public]
 *     summary: Get CMS navigation tree
 *     responses:
 *       200:
 *         description: Navigation payload
 */
router.get("/cms/navigation", cmsController.getNavigation);
router.get("/cms/footer-links", cmsController.getFooterLinks);

router.get("/cms/org-chart", cmsController.getOrgChart);

/**
 * @swagger
 * /cms/pages:
 *   get:
 *     tags: [Public]
 *     summary: Get a CMS page by path
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: true
 *         description: Page path (e.g., /about)
 *     responses:
 *       200:
 *         description: Page content
 */
router.get("/cms/pages", cmsController.getPage);

/**
 * @swagger
 * /cms/media:
 *   get:
 *     tags: [Public]
 *     summary: List published media
 *     responses:
 *       200:
 *         description: Media list
 */
router.get("/cms/media", cmsController.getMedia);

/**
 * @swagger
 * /cms/tables/{tableName}:
 *   get:
 *     tags: [Public]
 *     summary: Get a public CMS table
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
 *           minimum: 1
 *           maximum: 500
 *     responses:
 *       200:
 *         description: Table data
 */
router.get("/cms/tables/:tableName", cmsController.getPublicTable);

// Public user auth
router.post(
  "/auth/signup",
  [
    body("fullName").isLength({ min: 2 }).withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone")
      .optional({ values: "falsy" })
      .matches(/^[0-9+\-\s]{6,20}$/)
      .withMessage("Phone must be 6-20 digits"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  userAuthController.signup,
);

router.post(
  "/auth/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  userAuthController.login,
);

// Public success stories (year-wise images)
router.get("/v1/success-stories", async (req, res) => {
  try {
    const { year } = req.query;
    const items = await listSuccessStories(year || null);
    res.json({ data: items });
  } catch (error) {
    // Log the error server-side for easier debugging during development
    // and return a friendly JSON error to the client.
    // eslint-disable-next-line no-console
    console.error("Error fetching success stories:", error);
    res.status(500).json({ error: "Unable to fetch success stories" });
  }
});

export default router;
