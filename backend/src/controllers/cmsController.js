import { fetchNavigationTree, fetchPage, fetchMediaByCategory, fetchOrgChartTree, fetchFooterLinks } from "../services/cmsService.js";
import { fetchPublicTable } from "../services/adminSchemaService.js";

const MEDIA_CATEGORIES = new Set(["photo", "video", "newspaper", "audio", "carousel"]);

export async function getNavigation(req, res, next) {
  try {
    const tree = await fetchNavigationTree();
    res.json({ data: tree });
  } catch (error) {
    next(error);
  }
}

export async function getPage(req, res, next) {
  try {
    const { slug, path, lang } = req.query;
    if (!slug && !path) {
      return res
        .status(400)
        .json({ error: "Either slug or path query parameter is required" });
    }

    const page = await fetchPage({ slug, path, lang: typeof lang === "string" ? lang : undefined });
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.json({ data: page });
  } catch (error) {
    next(error);
  }
}

export async function getMedia(req, res, next) {
  try {
    const { category } = req.query;
    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "Category query parameter is required" });
    }
    if (!MEDIA_CATEGORIES.has(category)) {
      return res.status(400).json({ error: "Invalid media category" });
    }

    const items = await fetchMediaByCategory(category);
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
}

export async function getOrgChart(req, res, next) {
  try {
    const data = await fetchOrgChartTree();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPublicTable(req, res, next) {
  try {
    const { tableName } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await fetchPublicTable(tableName, limit);
    res.json({ data });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
}

export async function getFooterLinks(_req, res, next) {
  try {
    const data = await fetchFooterLinks();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
