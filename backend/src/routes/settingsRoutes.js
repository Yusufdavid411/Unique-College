import { Router } from "express";
import { listSettings, upsertSetting, readAdmissionsPolicy, saveAdmissionsPolicy, readSchoolProfile, updateSchoolProfile } from "../controllers/settingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.get("/school", readSchoolProfile);
router.patch("/school", requireAuth, requirePermission("settings.manage"), updateSchoolProfile);
router.get("/admissions", readAdmissionsPolicy);
router.put("/admissions", requireAuth, requirePermission("settings.manage"), saveAdmissionsPolicy);

router.get("/", requireAuth, requirePermission("settings.manage"), listSettings);
router.post("/", requireAuth, requirePermission("settings.manage"), upsertSetting);

export default router;
