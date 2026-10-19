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

const applicationDetails = {
  applicant: { select: { id: true, name: true, email: true, role: true, portalUsername: true, officialEmail: true } },
  documents: { orderBy: { createdAt: "desc" } },
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "desc" } }
};

function studentCredentials(application) {
  const suffix = (application.applicationNumber || application.id).replace(/[^a-z0-9]/gi, "").slice(-7).toUpperCase();
  const year = new Date().getFullYear();
  const studentNumber = application.studentNumber || `UCHK/${year}/${suffix}`;
  const portalUsername = `UC${year}${suffix}`;
  const officialEmail = `${portalUsername.toLowerCase()}@students.uniquecollegekwali.edu.ng`;
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
    where: status ? { status } : undefined,
    include: {
      _count: { select: { documents: true, payments: true } },
      payments: { select: { status: true, amount: true, type: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  ok(res, applications);
});

export const getApplication = asyncHandler(async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, include: applicationDetails });
  if (!application) {
    return res.status(404).json({ success: false, message: "Application not found" });
  }
  ok(res, { ...application, allowedStatuses: reviewStatusesFor(application.status) });
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
  if (!canReviewTransition(current.status, req.body.status)) return res.status(409).json({ success: false, message: "This decision is not available from the current application status" });
  if (req.body.status === "ADMITTED" && current.status !== "ADMITTED" && (!current.applicant || !current.declarationAccepted || !formAccessFor(current).unlocked || !hasVerifiedAdmissionDocuments(current.documents))) {
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
    const updated = await transaction.application.findUnique({ where: { id: req.params.id }, include: applicationDetails });
    await transaction.applicationStatusHistory.create({
      data: {
        applicationId: current.id,
        fromStatus: current.status,
        toStatus: req.body.status,
        note: req.body.reviewNote || null,
        changedBy: req.user.name
      }
    });
    return updated;
  });

  ok(res, { application: { ...application, allowedStatuses: reviewStatusesFor(application.status) }, credentials }, credentials ? "Applicant admitted and student credentials created" : "Application status updated");
});

export const reviewApplicationDocument = asyncHandler(async (req, res) => {
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
