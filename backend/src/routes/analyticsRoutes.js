import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { analyticsDevice, analyticsReferrer, ignoredAnalyticsRequest, normalizeAnalyticsPath, publicWebsiteOrigins, recordWebsitePageView, websiteAnalyticsSummary } from "../services/websiteAnalytics.js";

const router = Router();
const limit = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const eventSchema = z.object({ id: z.string().uuid(), path: z.string().max(120), referrer: z.string().max(300).optional() }).strict();

router.post("/pageviews", limit, asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!publicWebsiteOrigins.includes(req.get("Origin"))) return res.sendStatus(403);
  if (process.env.ANALYTICS_ENABLED === "false" || ignoredAnalyticsRequest(req)) return res.sendStatus(204);
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.sendStatus(422);
  const path = normalizeAnalyticsPath(parsed.data.path);
  if (!path) return res.sendStatus(422);
  await recordWebsitePageView(prisma, { ...parsed.data, path, referrer: analyticsReferrer(parsed.data.referrer), ip: req.ip, device: analyticsDevice(req.get("user-agent")) });
  res.sendStatus(204);
}));

router.get("/summary", requireAuth, requirePermission("analytics.read"), asyncHandler(async (req, res) => {
  const parsed = z.enum(["7", "30", "90"]).safeParse(req.query.days || "30");
  if (!parsed.success) return res.status(422).json({ message: "Select a 7, 30 or 90 day reporting period." });
  res.set("Cache-Control", "private, no-store");
  ok(res, await websiteAnalyticsSummary(prisma, Number(parsed.data)));
}));

export default router;
