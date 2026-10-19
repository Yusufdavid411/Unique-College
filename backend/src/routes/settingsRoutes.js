import { Router } from "express";
import { listSettings, upsertSetting, readAdmissionsPolicy, saveAdmissionsPolicy } from "../controllers/settingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.get("/admissions", readAdmissionsPolicy);
router.put("/admissions", requireAuth, requirePermission("settings.manage"), saveAdmissionsPolicy);

router.get("/", requireAuth, requirePermission("settings.manage"), listSettings);
router.post("/", requireAuth, requirePermission("settings.manage"), upsertSetting);

export default router;
