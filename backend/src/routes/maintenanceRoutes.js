import crypto from "node:crypto";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { processNotificationQueue } from "../services/notificationQueue.js";

export function validMaintenanceSecret(header, secret) {
  if (typeof secret !== "string" || secret.length < 32 || typeof header !== "string") return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(header);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

const router = Router();
router.get("/notifications", asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!validMaintenanceSecret(req.headers.authorization, process.env.CRON_SECRET)) return res.status(401).json({ success: false, message: "Authentication required" });
  const result = await processNotificationQueue();
  ok(res, result, result.configured ? "Notification retry batch processed." : "Email sender is not configured. Notifications remain queued.");
}));
export default router;
