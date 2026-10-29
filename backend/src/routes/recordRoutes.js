import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hasPermission } from "../services/permissions.js";
import { formAccessFor } from "../services/formAccess.js";
import { applicationFormPdf, paymentReceiptPdf } from "../services/applicationPdf.js";
import { canDownloadApplication } from "../services/applicationReview.js";

const router = Router();
router.use(requireAuth);
router.get("/applications/:id/:kind", asyncHandler(async (req, res) => {
  if (req.params.kind !== "form") return res.sendStatus(404);
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, include: { payments: true } });
  if (!application) return res.sendStatus(404);
  const owner = application.applicantId === req.user.id;
  if (!owner && !hasPermission(req.user, "applications.read")) return res.sendStatus(404);
  if (owner && !formAccessFor(application).unlocked) return res.status(402).json({ message: "Your application form unlocks after the application fee is verified" });
  if (!canDownloadApplication(application)) return res.status(409).json({ message: "The application form can be downloaded only after a paid, submitted application has been accepted" });
  const bytes = await applicationFormPdf(application);
  res.set({ "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.attachment("application-form.pdf").send(Buffer.from(bytes));
}));
router.get("/applications/:id/payments/:paymentId/receipt", asyncHandler(async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, include: { payments: true } });
  if (!application) return res.sendStatus(404);
  const owner = application.applicantId === req.user.id;
  if (!owner && !hasPermission(req.user, "applications.read") && !hasPermission(req.user, "payments.verify")) return res.sendStatus(404);
  const payment = application.payments.find((record) => record.id === req.params.paymentId);
  if (!payment) return res.sendStatus(404);
  const bytes = await paymentReceiptPdf(application, payment);
  res.set({ "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.attachment("payment-receipt.pdf").send(Buffer.from(bytes));
}));
export default router;
