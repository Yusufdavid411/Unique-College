import { Router } from "express";
import { listSettings, upsertSetting } from "../controllers/settingsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN"), listSettings);
router.post("/", requireAuth, requireRole("ADMIN"), upsertSetting);

export default router;
