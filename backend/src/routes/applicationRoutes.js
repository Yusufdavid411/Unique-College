import { Router } from "express";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  reviewApplicationDocument,
  reviewApplicationPayment,
  updateApplicationStatus
} from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { applicationSchema, documentReviewSchema, idParamSchema, paymentReviewSchema, statusSchema } from "../validators/schemas.js";

const router = Router();
const upload = imageUpload("applications");

router.post("/", upload.single("passport"), validate(applicationSchema), createApplication);
router.get("/", requireAuth, requireRole("ADMIN"), listApplications);
router.get("/:id", requireAuth, requireRole("ADMIN"), validate(idParamSchema), getApplication);
router.patch("/:id/status", requireAuth, requireRole("ADMIN"), validate(statusSchema), updateApplicationStatus);
router.patch("/:id/documents/:documentId", requireAuth, requireRole("ADMIN"), validate(documentReviewSchema), reviewApplicationDocument);
router.patch("/:id/payments/:paymentId", requireAuth, requireRole("ADMIN"), validate(paymentReviewSchema), reviewApplicationPayment);
router.delete("/:id", requireAuth, requireRole("ADMIN"), validate(idParamSchema), deleteApplication);

export default router;
