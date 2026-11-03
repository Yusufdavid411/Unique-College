import { Router } from "express";
import admissionsDocumentsRoutes from "./admissionsDocumentsRoutes.js";
import platformReadinessRoutes from "./platformReadinessRoutes.js";
import { listSettings, upsertSetting, readAdmissionsPolicy, saveAdmissionsPolicy, readSchoolProfile, updateSchoolProfile, readAcceptancePolicy, saveAcceptancePolicy } from "../controllers/settingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use("/readiness", platformReadinessRoutes);
router.use("/admissions-documents", admissionsDocumentsRoutes);
router.get("/acceptance-fee", requireAuth, requirePermission("settings.manage"), readAcceptancePolicy);
router.put("/acceptance-fee", requireAuth, requirePermission("settings.manage"), saveAcceptancePolicy);
router.get("/school", readSchoolProfile);
router.patch("/school", requireAuth, requirePermission("settings.manage"), updateSchoolProfile);
router.get("/admissions", readAdmissionsPolicy);
router.put("/admissions", requireAuth, requirePermission("settings.manage"), saveAdmissionsPolicy);

router.get("/", requireAuth, requirePermission("settings.manage"), listSettings);
router.post("/", requireAuth, requirePermission("settings.manage"), upsertSetting);

export default router;
