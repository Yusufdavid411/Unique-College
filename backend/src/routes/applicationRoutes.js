import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { setTimeout as pause } from "node:timers/promises";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { requestPasswordReset } from "../services/passwordReset.js";
import { attemptStatusEmail, statusEmailConfigured } from "../services/statusEmail.js";
import { createApplicationReminder } from "../services/applicationReminder.js";
import { verifyReviewedDocuments } from "../services/bulkDocumentReview.js";
import { bulkAudiences, bulkLimit, bulkNotificationPreview, sendBulkApplicationNotification } from "../services/applicationBulkNotifications.js";
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
const bulkAccess = [requireAuth, requirePermission("applications.read"), requirePermission("applications.review")];
const audienceSchema = z.enum(Object.keys(bulkAudiences));
router.get("/bulk-notifications", ...bulkAccess, asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const preview = await bulkNotificationPreview(prisma, audienceSchema.parse(req.query.audience));
  ok(res, { ...preview, recipients: preview.recipients.map(({ id, fullName }) => ({ id, fullName })) });
}));
router.post("/bulk-notifications", ...bulkAccess, rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }), asyncHandler(async (req, res) => {
  const input = z.object({ audience: audienceSchema, ids: z.array(z.string().uuid()).min(1).max(bulkLimit), closingDate: z.string().date().nullable(), message: z.string().trim().max(1500).optional() }).strict()
    .refine(({ ids }) => new Set(ids).size === ids.length, "Recipients must be unique.").parse(req.body);
  const events = await sendBulkApplicationNotification(prisma, input, req.user);
  let emailSent = 0;
  if (statusEmailConfigured()) for (const [index, event] of events.slice(0, 3).entries()) {
    if (index) await pause(550);
    if ((await attemptStatusEmail(event.id)).status === "SENT") emailSent++;
  }
  ok(res, { notified: events.length, emailPending: events.length - emailSent });
}));
router.get("/:id", requireAuth, requirePermission("applications.read"), validate(idParamSchema), getApplication);
router.post("/:id/reminder", requireAuth, requirePermission("applications.read"), requirePermission("applications.review"), rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }), validate(idParamSchema), asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const event = await createApplicationReminder(prisma, req.params.id, req.user);
  const email = await attemptStatusEmail(event.id);
  ok(res, { email }, email.status === "SENT" ? "Reminder saved in the applicant portal and accepted by the email provider." : "Reminder saved in the applicant portal. Email delivery is pending and will be retried.");
}));
router.post("/:id/account/reset-link", requireAuth, requirePermission("applications.read"), requirePermission("users.manage"), rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }), validate(idParamSchema), asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, select: { applicant: { select: { id: true, role: true, isActive: true } } } });
  const account = application?.applicant;
  if (!account?.isActive || !["APPLICANT", "STUDENT"].includes(account.role)) return res.status(404).json({ success: false, message: "No active applicant account is linked to this application." });
  if (!statusEmailConfigured()) return res.status(503).json({ success: false, code: "RESET_EMAIL_NOT_CONFIGURED", message: "Password-reset email is not configured. Set up Resend before sending reset links." });
  if (!await requestPasswordReset(null, { userId: account.id, actorId: req.user.id })) return res.status(429).json({ success: false, message: "A reset was requested recently. Wait a minute before trying again." });
  ok(res, null, "Reset email accepted for delivery.");
}));
router.delete("/:id/account", requireAuth, requireRole("ADMIN"), validate(idParamSchema.extend({ body: z.object({ confirmation: z.string().trim().email().max(254) }).strict() })), deleteApplicantAccount);
router.patch("/:id/status", requireAuth, requirePermission("applications.review"), validate(statusSchema), updateApplicationStatus);
router.patch("/:id/clearance", requireAuth, requirePermission("applications.admit"), validate(idParamSchema), updateClearance);
router.post("/:id/notifications/retry", requireAuth, requirePermission("applications.review"), validate(idParamSchema), retryApplicationNotification);
router.patch("/:id/documents/:documentId", requireAuth, requirePermission("applications.review"), validate(documentReviewSchema), reviewApplicationDocument);
router.post("/:id/documents/verify-all", requireAuth, requirePermission("applications.review"), validate(idParamSchema), asyncHandler(async (req, res) => {
  const input = z.object({ reviewed: z.literal(true), documents: z.array(z.object({ id: z.string().uuid(), updatedAt: z.string().datetime() }).strict()).min(1).max(50) }).strict().parse(req.body);
  ok(res, await verifyReviewedDocuments(prisma, req.params.id, input.documents, req.user), "Reviewed documents verified.");
}));
router.patch("/:id/payments/:paymentId", requireAuth, requirePermission("payments.verify"), validate(paymentReviewSchema), reviewApplicationPayment);
router.delete("/:id", requireAuth, requirePermission("applications.admit"), validate(idParamSchema), deleteApplication);

export default router;
