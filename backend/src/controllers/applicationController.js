import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileMetadata } from "../services/uploadService.js";
import { hasPermission } from "../services/permissions.js";
import { auditedMutation } from "../services/audit.js";
import { Prisma } from "@prisma/client";
import { canReviewTransition, hasVerifiedAdmissionDocuments, reviewStatusesFor } from "../services/admissionWorkflow.js";
import { formAccessFor } from "../services/formAccess.js";
import { readyForReview } from "../services/applicationReview.js";
import { attemptStatusEmail, statusEmailConfigured } from "../services/statusEmail.js";

const applicationDetails = {
  applicant: { select: { id: true, name: true, email: true, role: true, portalUsername: true, officialEmail: true } },
  documents: { orderBy: { createdAt: "desc" } },
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "desc" } }
};

function studentCredentials(application) {
  const suffix = (application.applicationNumber || application.id).replace(/[^a-z0-9]/gi, "").slice(-7).toUpperCase();
  const year = new Date().getFullYear();
  const studentNumber = application.studentNumber || `${application.isTest ? "TEST" : "UCHK"}/${year}/${suffix}`;
  const portalUsername = `${application.isTest ? "TEST" : "UC"}${year}${suffix}`;
  const officialEmail = application.isTest ? null : `${portalUsername.toLowerCase()}@uniquecollegekwali.com`;
  const temporaryPassword = `Uc!${crypto.randomBytes(5).toString("base64url")}7`;
  return { studentNumber, portalUsername, officialEmail, temporaryPassword };
}

export const createApplication = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Passport photograph is required" });
  }

  const metadata = fileMetadata(req.file, "applications");
  const application = await prisma.application.create({
    data: {
      ...req.body,
      previousQualification: req.body.previousQualification || "Not provided",
      dateOfBirth: new Date(req.body.dateOfBirth),
      passportPath: metadata.path,
      passportFileType: metadata.fileType,
      passportFileSize: metadata.fileSize
    }
  });

  created(res, application, "Application submitted successfully");
});

export const listApplications = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const applications = await prisma.application.findMany({
    where: { isTest: req.query.testing === "true", ...(status ? { status } : {}) },
    select: {
      id: true, isTest: true, applicationNumber: true, fullName: true, email: true, status: true,
      submittedAt: true, createdAt: true, courseOfInterest: true, formFeeAmount: true,
      payments: { select: { status: true, amount: true, type: true, currency: true, isTest: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  ok(res, applications.map((application) => ({ ...application, courseOfInterest: readyForReview(application) ? application.courseOfInterest : null, reviewReady: readyForReview(application) })));
});

function reviewResponse(application) {
  const reviewReady = readyForReview(application);
  const paymentConfirmed = formAccessFor(application).unlocked;
  if (!reviewReady) return {
    id: application.id, isTest: application.isTest, fullName: application.fullName, applicationNumber: application.applicationNumber,
    status: application.status, submittedAt: application.submittedAt, paymentConfirmed, reviewReady,
    reviewNote: application.reviewNote, statusHistory: application.statusHistory, emailConfigured: statusEmailConfigured(),
    payments: application.payments.filter((payment) => payment.status === "VERIFIED"), allowedStatuses: []
  };
  return { ...application, reviewReady, paymentConfirmed, allowedStatuses: reviewStatusesFor(application.status), emailConfigured: statusEmailConfigured() };
}

export const getApplication = asyncHandler(async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, include: applicationDetails });
  if (!application) {
    return res.status(404).json({ success: false, message: "Application not found" });
  }
  ok(res, reviewResponse(application));
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  if (["ACCEPTED", "ADMITTED"].includes(req.body.status) && !hasPermission(req.user, "applications.admit")) {
    return res.status(403).json({ success: false, message: "Admission approval permission required" });
  }
  const current = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { applicant: true, documents: true, payments: true }
  });
  if (!current) return res.status(404).json({ success: false, message: "Application not found" });
  if (!readyForReview(current)) return res.status(409).json({ success: false, message: "Only a paid, submitted application can be reviewed. Wait for the applicant to submit their form." });
  if (!canReviewTransition(current.status, req.body.status)) return res.status(409).json({ success: false, message: "This decision is not available from the current application status" });
  if (req.body.status === "RETURNED" && !req.body.reviewNote?.trim()) return res.status(422).json({ success: false, message: "Explain the corrections required before returning this application." });
  if (["ACCEPTED", "ADMITTED"].includes(req.body.status) && current.status !== req.body.status && (!current.applicant || !current.declarationAccepted || !formAccessFor(current).unlocked || !hasVerifiedAdmissionDocuments(current.documents))) {
    return res.status(422).json({ success: false, message: "Admission requires an applicant account, verified form payment, declaration, and verified supporting documents" });
  }

  let credentials = null;
  let passwordHash = null;
  const data = {
    status: req.body.status,
    reviewNote: req.body.reviewNote || null,
    ...(req.body.interviewDate !== undefined ? { interviewDate: req.body.interviewDate ? new Date(req.body.interviewDate) : null } : {}),
    entranceExamScore: req.body.entranceExamScore,
    interviewScore: req.body.interviewScore,
    ...(req.body.dateResumed !== undefined ? { dateResumed: req.body.dateResumed ? new Date(req.body.dateResumed) : null } : {})
  };

  if (req.body.status === "ADMITTED" && current.applicant && current.status !== "ADMITTED") {
    credentials = studentCredentials(current);
    data.studentNumber = credentials.studentNumber;
    data.admittedAt = new Date();
    passwordHash = await bcrypt.hash(credentials.temporaryPassword, 12);
  }

  const application = await auditedMutation(prisma, { actorId: req.user.id, action: "application.status:" + req.body.status, targetType: "application", targetId: current.id }, async (transaction) => {
    if (credentials) {
      await transaction.user.update({
        where: { id: current.applicant.id },
        data: {
          role: "STUDENT",
          portalUsername: credentials.portalUsername,
          officialEmail: credentials.officialEmail,
          passwordHash,
          mustChangePassword: true,
          sessionVersion: { increment: 1 }
        }
      });
    }
    const changed = await transaction.application.updateMany({
      where: { id: req.params.id, status: current.status, updatedAt: current.updatedAt },
      data
    });
    if (!changed.count) throw Object.assign(new Error("This application changed during review. Reload it before saving."), { statusCode: 409 });
    const history = await transaction.applicationStatusHistory.create({
      data: {
        applicationId: current.id,
        fromStatus: current.status,
        toStatus: req.body.status,
        note: req.body.reviewNote || null,
        changedBy: req.user.name,
        ...(current.status !== req.body.status ? { emailStatus: "PENDING", emailRecipient: current.email } : {})
      }
    });
    return { updated: await transaction.application.findUnique({ where: { id: req.params.id }, include: applicationDetails }), historyId: current.status !== req.body.status ? history?.id : null };
  });

  const email = await attemptStatusEmail(application.historyId);
  const refreshed = await prisma.application.findUnique({ where: { id: current.id }, include: applicationDetails });
  ok(res, { application: reviewResponse(refreshed), credentials, email }, credentials ? "Applicant admitted and student credentials created" : "Application status updated");
});

export const retryApplicationNotification = asyncHandler(async (req, res) => {
  if (!statusEmailConfigured()) return res.status(503).json({ message: "Configure a verified email sender before sending notifications." });
  const history = await prisma.applicationStatusHistory.findFirst({ where: { applicationId: req.params.id, emailStatus: { in: ["PENDING", "FAILED", "SENDING"] }, emailRecipient: { not: null } }, orderBy: { createdAt: "desc" } });
  if (!history) return ok(res, { status: "UNCHANGED" }, "No pending email notification.");
  const email = await attemptStatusEmail(history.id);
  ok(res, email, email.status === "SENT" ? "Notification accepted by the email provider." : "Email is still pending. Wait a minute before retrying; check sender configuration if this continues.");
});

export const reviewApplicationDocument = asyncHandler(async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, include: { payments: true } });
  if (!application || !readyForReview(application)) return res.status(409).json({ success: false, message: "Documents can be reviewed only after payment and application submission." });
  const document = await prisma.applicationDocument.findFirst({
    where: { id: req.params.documentId, applicationId: req.params.id }
  });
  if (!document) return res.status(404).json({ success: false, message: "Document not found" });
  const updated = await auditedMutation(prisma, { actorId: req.user.id, action: "document.review:" + req.body.reviewStatus, targetType: "document", targetId: document.id }, (transaction) => transaction.applicationDocument.update({
    where: { id: document.id },
    data: { reviewStatus: req.body.reviewStatus, reviewNote: req.body.reviewNote || null }
  }));
  ok(res, updated, "Document review updated");
});

export const reviewApplicationPayment = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.paymentId, applicationId: req.params.id }
  });
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  if (payment.provider === "FLUTTERWAVE") return res.status(409).json({ success: false, message: "Flutterwave payment status is verified automatically and cannot be overridden here." });
  if (payment.status === "CANCELLED") return res.status(409).json({ success: false, message: "This receipt was withdrawn by the applicant" });
  if (payment.type === "APPLICATION_FEE" && req.body.status === "VERIFIED") {
    const application = await prisma.application.findUnique({ where: { id: req.params.id } });
    if (application.formFeeAmount !== null && !new Prisma.Decimal(payment.amount).equals(application.formFeeAmount)) return res.status(422).json({ success: false, message: "The recorded amount must match the applicant's quoted form fee before verification" });
  }
  const updated = await auditedMutation(prisma, { actorId: req.user.id, action: "payment.review:" + req.body.status, targetType: "payment", targetId: payment.id }, async (transaction) => {
    if (req.body.status === "PENDING" && payment.status !== "PENDING") {
      const pending = await transaction.payment.findFirst({ where: { applicationId: payment.applicationId, status: "PENDING", id: { not: payment.id } }, select: { id: true } });
      if (pending) throw Object.assign(new Error("Another receipt is already awaiting review"), { statusCode: 409 });
    }
    const changed = await transaction.payment.updateMany({ where: { id: payment.id, status: payment.status, updatedAt: payment.updatedAt }, data: {
      status: req.body.status,
      reviewNote: req.body.reviewNote || null,
      verifiedAt: req.body.status === "VERIFIED" ? new Date() : null
    } });
    if (!changed.count) throw Object.assign(new Error("The receipt changed. Reload it before reviewing."), { statusCode: 409 });
    return transaction.payment.findUnique({ where: { id: payment.id } });
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, updated, "Payment review updated");
});

export const deleteApplication = asyncHandler(async (req, res) => {
  await auditedMutation(prisma, { actorId: req.user.id, action: "application.deleted", targetType: "application", targetId: req.params.id }, (transaction) => transaction.application.delete({ where: { id: req.params.id } }));
  ok(res, null, "Application deleted");
});
