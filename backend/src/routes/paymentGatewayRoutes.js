import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { flutterwaveService, paymentConfiguration, validWebhookHash } from "../services/flutterwave.js";

const router = Router();
const limit = rateLimit({ windowMs: 60000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/webhook", asyncHandler(async (req, res) => {
  const config = paymentConfiguration();
  if (!config.enabled || !validWebhookHash(req.get("verif-hash"), config.webhookHash)) return res.status(401).json({ success: false, message: "Invalid webhook signature" });
  const result = await flutterwaveService(prisma).webhook(req.body);
  ok(res, result);
}));

router.use(requireAuth, requireRole("APPLICANT", "STUDENT"), limit);
router.post("/checkout", asyncHandler(async (req, res) => {
  ok(res, await flutterwaveService(prisma).start(req.user.id));
}));
router.post("/verify", asyncHandler(async (req, res) => {
  const { reference } = z.object({ reference: z.string().min(1).max(100) }).parse(req.body);
  ok(res, await flutterwaveService(prisma).verify(reference, req.user.id));
}));

export default router;
