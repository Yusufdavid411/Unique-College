import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { platformReadiness } from "../services/platformReadiness.js";

const router = Router();
router.get("/", requireAuth, requirePermission("settings.manage"), asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  ok(res, await platformReadiness());
}));
export default router;
