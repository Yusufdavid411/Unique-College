import { Router } from "express";
import {
  createApplication,
  getApplication,
  listApplications,
  updateApplicationStatus
} from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { applicationSchema, idParamSchema, statusSchema } from "../validators/schemas.js";

const router = Router();
const upload = imageUpload("applications");

router.post("/", upload.single("passport"), validate(applicationSchema), createApplication);
router.get("/", requireAuth, requireRole("ADMIN"), listApplications);
router.get("/:id", requireAuth, requireRole("ADMIN"), validate(idParamSchema), getApplication);
router.patch("/:id/status", requireAuth, requireRole("ADMIN"), validate(statusSchema), updateApplicationStatus);

export default router;
