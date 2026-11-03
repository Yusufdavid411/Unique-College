import { Router } from "express";
import { z } from "zod";
import { updateClearance } from "../controllers/handoverController.js";
import {
  deleteApplication,
  deleteApplicantAccount,
  getApplication,
  listApplications,
  reviewApplicationDocument,
  reviewApplicationPayment,
  updateApplicationStatus,
  retryApplicationNotification
} from "../controllers/applicationController.js";
import { requireAuth, requirePermission, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { documentReviewSchema, idParamSchema, paymentReviewSchema, statusSchema } from "../validators/schemas.js";

const router = Router();

router.post("/", (req, res) => res.status(410).json({ success: false, message: "Create an applicant account to purchase and complete your application form" }));
router.get("/", requireAuth, requirePermission("applications.read"), listApplications);
router.get("/:id", requireAuth, requirePermission("applications.read"), validate(idParamSchema), getApplication);
router.delete("/:id/account", requireAuth, requireRole("ADMIN"), validate(idParamSchema.extend({ body: z.object({ confirmation: z.string().trim().email().max(254) }).strict() })), deleteApplicantAccount);
router.patch("/:id/status", requireAuth, requirePermission("applications.review"), validate(statusSchema), updateApplicationStatus);
router.patch("/:id/clearance", requireAuth, requirePermission("applications.admit"), validate(idParamSchema), updateClearance);
router.post("/:id/notifications/retry", requireAuth, requirePermission("applications.review"), validate(idParamSchema), retryApplicationNotification);
router.patch("/:id/documents/:documentId", requireAuth, requirePermission("applications.review"), validate(documentReviewSchema), reviewApplicationDocument);
router.patch("/:id/payments/:paymentId", requireAuth, requirePermission("payments.verify"), validate(paymentReviewSchema), reviewApplicationPayment);
router.delete("/:id", requireAuth, requirePermission("applications.admit"), validate(idParamSchema), deleteApplication);

export default router;
