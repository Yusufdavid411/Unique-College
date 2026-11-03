import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileMetadata } from "../services/uploadService.js";
import { loginApplicant, toPublicUser } from "../services/authService.js";
import { formAccessFor } from "../services/formAccess.js";
import { Prisma } from "@prisma/client";
import { createPendingPayment, pendingReceiptMessage } from "../services/paymentSubmission.js";
import { auditedMutation } from "../services/audit.js";
import { publicPaymentConfiguration } from "../services/flutterwave.js";
import { attemptStatusEmail } from "../services/statusEmail.js";
import { admissionProgressFor } from "../services/acceptance.js";
import { screeningPolicy, screeningProgress } from "../services/admissionDocuments.js";
import { applicantJourney, applicationFormMissing, applicationDocumentsMissing } from "../services/applicantJourney.js";
import { replaceApplicationDocument } from "../services/applicationDocuments.js";

const editableStatuses = ["DRAFT", "RETURNED"];
const documentsEditable = (application) => editableStatuses.includes(application.status) || (application.status === "ACCEPTED" && application.clearanceStatus === "CORRECTIONS_REQUIRED");

function applicationNumber() {
  return `UCHK-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function applicantInclude() {
  return {
    applicant: { select: { portalUsername: true, officialEmail: true, role: true } },
    documents: { where: { supersededAt: null }, orderBy: { createdAt: "desc" } },
    payments: { orderBy: { createdAt: "desc" } },
    statusHistory: { orderBy: { createdAt: "desc" } },
    schoolForms: true, admissionLetters: { orderBy: { version: "desc" }, take: 1 }
  };
}

async function getApplicantApplication(userId) {
  const application = await prisma.application.findUnique({
    where: { applicantId: userId },
    include: applicantInclude()
  });

  if (!application) {
    const error = new Error("Applicant record not found");
    error.statusCode = 404;
    throw error;
  }

  return application;
}

export const registerApplicant = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ success: false, message: "An account already exists for this email address" });
  }

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const number = applicationNumber();
  await prisma.user.create({
    data: {
      name: req.body.fullName,
      email,
      passwordHash,
      role: "APPLICANT",
      application: {
        create: {
          applicationNumber: number,
          formFeeAmount: req.admissionsPolicy.applicationFee,
          fullName: req.body.fullName,
          email,
          phoneNumber: req.body.phoneNumber,
          status: "DRAFT",
          statusHistory: {
            create: {
              toStatus: "DRAFT",
              note: "Applicant account created",
              changedBy: req.body.fullName
            }
          }
        }
      }
    }
  });

  const session = await loginApplicant(email, req.body.password);
  created(res, session, "Applicant account created");
});

export const getApplicantDashboard = asyncHandler(async (req, res) => {
  const application = await getApplicantApplication(req.user.id);
  ok(res, { application, journey: applicantJourney(application), user: toPublicUser(req.user), screening: screeningProgress(application, application.screeningFeeAmount == null ? (await screeningPolicy(prisma)).amount : undefined), formAccess: formAccessFor(application), admission: admissionProgressFor(application), paymentGateway: publicPaymentConfiguration() });
});

export const updateApplicantApplication = asyncHandler(async (req, res) => {
  const current = await getApplicantApplication(req.user.id);
  if (!editableStatuses.includes(current.status)) {
    return res.status(409).json({
      success: false,
      message: "This application is locked while the admissions team reviews it"
    });
  }

  const data = { ...req.body };
  if (data.dateOfBirth !== undefined) data.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.firstName || data.surname || data.middleName) {
    data.fullName = [data.surname ?? current.surname, data.firstName ?? current.firstName, data.middleName ?? current.middleName]
      .filter(Boolean)
      .join(" ");
  }
  if (data.postalAddress) data.address = data.postalAddress;

  const application = await prisma.application.update({
    where: { id: current.id },
    data,
    include: applicantInclude()
  });

  if (data.fullName) {
    await prisma.user.update({ where: { id: req.user.id }, data: { name: data.fullName } });
  }

  ok(res, application, "Application draft saved");
});

export const submitApplicantApplication = asyncHandler(async (req, res) => {
  const application = await getApplicantApplication(req.user.id);
  if (!editableStatuses.includes(application.status)) {
    return res.status(409).json({ success: false, message: "This application has already been submitted" });
  }

  const missing = [...applicationFormMissing(application), ...applicationDocumentsMissing(application)];
  if (missing.length) {
    return res.status(422).json({ success: false, message: "Complete all required application steps", data: { missing } });
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.application.updateMany({
      where: { id: application.id, status: application.status, updatedAt: application.updatedAt },
      data: { status: "SUBMITTED", submittedAt: new Date(), dateReceived: new Date(), reviewNote: null }
    });
    if (!changed.count) throw Object.assign(new Error("Your application changed. Reload it before submitting again."), { statusCode: 409 });
    const history = await transaction.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: "SUBMITTED",
        note: "Application submitted for review",
        changedBy: req.user.name,
        emailStatus: "PENDING",
        emailRecipient: application.email
      }
    });
    return { application: await transaction.application.findUnique({ where: { id: application.id }, include: applicantInclude() }), historyId: history?.id };
  });

  await attemptStatusEmail(updated.historyId);
  ok(res, updated.application, "Your application is under review. Please check back later for a decision.");
});

export const requireCompletedApplicationForm = asyncHandler(async (req, res, next) => {
  const application = await getApplicantApplication(req.user.id);
  if (!documentsEditable(application)) return res.status(409).json({ success: false, message: "Documents cannot be changed during review" });
  if (editableStatuses.includes(application.status) && applicationFormMissing(application).length) return res.status(409).json({ success: false, message: "Complete and save your application form before uploading supporting documents." });
  next();
});

export const uploadApplicantDocument = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Please choose a document to upload" });
  const application = await getApplicantApplication(req.user.id);
  if (!documentsEditable(application)) {
    return res.status(409).json({ success: false, message: "Documents cannot be changed during review" });
  }

  if (editableStatuses.includes(application.status) && applicationFormMissing(application).length) return res.status(409).json({ success: false, message: "Complete and save your application form before uploading supporting documents." });

  const metadata = fileMetadata(req.file, "documents");
  const document = await replaceApplicationDocument(prisma, application, { type: req.body.type, label: req.body.label, ...metadata }, req.user.id);

  created(res, document, "Document uploaded");
});

export const deleteApplicantDocument = asyncHandler(async (req, res) => {
  const application = await getApplicantApplication(req.user.id);
  if (!documentsEditable(application)) {
    return res.status(409).json({ success: false, message: "Documents cannot be changed during review" });
  }
  const document = await prisma.applicationDocument.findFirst({
    where: { id: req.params.documentId, applicationId: application.id, supersededAt: null }
  });
  if (!document) return res.status(404).json({ success: false, message: "Document not found" });
  if (application.status === "ACCEPTED" && document.reviewStatus === "VERIFIED") return res.status(409).json({ success: false, message: "Verified admission documents must be retained. Upload a correction instead." });
  await prisma.$transaction(async (transaction) => {
    const changed = await transaction.application.updateMany({ where: { id: application.id, updatedAt: application.updatedAt, status: application.status, ...(application.status === "ACCEPTED" ? { clearanceStatus: "CORRECTIONS_REQUIRED" } : {}) }, data: { updatedAt: new Date(), ...(document.type === "PASSPORT" ? { passportPath: null, passportFileType: null, passportFileSize: null } : {}) } });
    if (!changed.count) throw Object.assign(new Error("The admission record changed. Refresh before removing a document."), { statusCode: 409 });
    await transaction.applicationDocument.update({ where: { id: document.id }, data: { supersededAt: new Date() } });
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, null, "Document removed");
});

export const recordApplicantPayment = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Payment evidence is required" });
  const application = await getApplicantApplication(req.user.id);
  if (req.body.type === "APPLICATION_FEE" && application.formFeeAmount !== null && !new Prisma.Decimal(req.body.amount).equals(application.formFeeAmount)) return res.status(422).json({ success: false, message: "Record the exact form fee quoted on your account" });

  const metadata = fileMetadata(req.file, "documents");
  const payment = await createPendingPayment(prisma, application.id, {
      type: req.body.type,
      amount: req.body.amount,
      reference: `FORM-${crypto.randomUUID()}`,
      paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
      proofPath: metadata.path,
      proofFileType: metadata.fileType,
      proofFileSize: metadata.fileSize
  });
  created(res, payment, "Payment evidence submitted for verification");
});

export const requireNoPendingReceipt = asyncHandler(async (req, res, next) => {
  if (publicPaymentConfiguration().provider === "FLUTTERWAVE") return res.status(409).json({ success: false, message: "Use the secure online payment checkout. Receipt uploads are no longer required." });
  const pending = await prisma.payment.findFirst({ where: { application: { applicantId: req.user.id }, status: "PENDING" }, select: { id: true } });
  if (pending) return res.status(409).json({ success: false, message: pendingReceiptMessage });
  next();
});

export const withdrawApplicantPayment = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.paymentId, application: { applicantId: req.user.id } } });
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  if (payment.provider === "FLUTTERWAVE") return res.status(409).json({ success: false, message: "Online payments cannot be withdrawn. Check their status with Flutterwave." });
  if (!["PENDING", "REJECTED"].includes(payment.status)) return res.status(409).json({ success: false, message: "Only pending or rejected receipts can be removed" });
  const updated = await auditedMutation(prisma, { actorId: req.user.id, action: "payment.withdrawn", targetType: "payment", targetId: payment.id }, async (transaction) => {
    const changed = await transaction.payment.updateMany({ where: { id: payment.id, status: payment.status, updatedAt: payment.updatedAt }, data: { status: "CANCELLED", reviewNote: "Withdrawn by applicant" } });
    if (!changed.count) throw Object.assign(new Error("The payment changed during review. Refresh your history."), { statusCode: 409 });
    return transaction.payment.findUnique({ where: { id: payment.id } });
  });
  ok(res, updated, "Receipt removed. You can upload a replacement.");
});
