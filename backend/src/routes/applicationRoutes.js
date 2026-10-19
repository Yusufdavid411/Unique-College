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
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requireAdmissionsOpen } from "../services/admissionsPolicy.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { applicationSchema, documentReviewSchema, idParamSchema, paymentReviewSchema, statusSchema } from "../validators/schemas.js";

const router = Router();
const upload = imageUpload("applications");

router.post("/", requireAdmissionsOpen, upload.single("passport"), validate(applicationSchema), createApplication);
router.get("/", requireAuth, requirePermission("applications.read"), listApplications);
router.get("/:id", requireAuth, requirePermission("applications.read"), validate(idParamSchema), getApplication);
router.patch("/:id/status", requireAuth, requirePermission("applications.review"), validate(statusSchema), updateApplicationStatus);
router.patch("/:id/documents/:documentId", requireAuth, requirePermission("applications.review"), validate(documentReviewSchema), reviewApplicationDocument);
router.patch("/:id/payments/:paymentId", requireAuth, requirePermission("payments.verify"), validate(paymentReviewSchema), reviewApplicationPayment);
router.delete("/:id", requireAuth, requirePermission("applications.admit"), validate(idParamSchema), deleteApplication);

export default router;
