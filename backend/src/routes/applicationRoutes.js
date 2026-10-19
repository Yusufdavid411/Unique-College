import { Router } from "express";
import {
  deleteApplication,
  getApplication,
  listApplications,
  reviewApplicationDocument,
  reviewApplicationPayment,
  updateApplicationStatus
} from "../controllers/applicationController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { documentReviewSchema, idParamSchema, paymentReviewSchema, statusSchema } from "../validators/schemas.js";

const router = Router();

router.post("/", (req, res) => res.status(410).json({ success: false, message: "Create an applicant account to purchase and complete your application form" }));
router.get("/", requireAuth, requirePermission("applications.read"), listApplications);
router.get("/:id", requireAuth, requirePermission("applications.read"), validate(idParamSchema), getApplication);
router.patch("/:id/status", requireAuth, requirePermission("applications.review"), validate(statusSchema), updateApplicationStatus);
router.patch("/:id/documents/:documentId", requireAuth, requirePermission("applications.review"), validate(documentReviewSchema), reviewApplicationDocument);
router.patch("/:id/payments/:paymentId", requireAuth, requirePermission("payments.verify"), validate(paymentReviewSchema), reviewApplicationPayment);
router.delete("/:id", requireAuth, requirePermission("applications.admit"), validate(idParamSchema), deleteApplication);

export default router;
