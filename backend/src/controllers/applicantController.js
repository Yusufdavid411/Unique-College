import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileMetadata } from "../services/uploadService.js";
import { loginApplicant, toPublicUser } from "../services/authService.js";
import { formAccessFor } from "../services/formAccess.js";
import { Prisma } from "@prisma/client";
import { requiredAdmissionDocuments } from "../services/admissionWorkflow.js";
import { createPendingPayment, pendingReceiptMessage } from "../services/paymentSubmission.js";
import { auditedMutation } from "../services/audit.js";

const editableStatuses = ["DRAFT", "RETURNED"];
const requiredDocumentTypes = requiredAdmissionDocuments;

function applicationNumber() {
  return `UCHK-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function applicantInclude() {
  return {
    applicant: { select: { portalUsername: true, officialEmail: true, role: true } },
    documents: { orderBy: { createdAt: "desc" } },
    payments: { orderBy: { createdAt: "desc" } },
    statusHistory: { orderBy: { createdAt: "desc" } }
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
  ok(res, { application, user: toPublicUser(req.user), formAccess: formAccessFor(application) });
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
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
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

  const requiredFields = [
    ["surname", "Surname"],
    ["firstName", "First name"],
    ["gender", "Sex"],
    ["dateOfBirth", "Date of birth"],
    ["lga", "LGA"],
    ["state", "State"],
    ["nationality", "Nationality"],
    ["maritalStatus", "Marital status"],
    ["postalAddress", "Postal address"],
    ["permanentAddress", "Permanent home address"],
    ["guardianName", "Parent or guardian name"],
    ["guardianAddress", "Parent or guardian address"],
    ["guardianRelationship", "Guardian relationship"],
    ["guardianPhone", "Parent or guardian phone"],
    ["courseOfInterest", "Course of interest"]
  ];
  const missing = requiredFields.filter(([key]) => !application[key]).map(([, label]) => label);
  const completeEducationRecords = Array.isArray(application.educationRecords)
    ? application.educationRecords.filter((record) => record.subject && record.grade && record.examBody && record.year)
    : [];
  if (completeEducationRecords.length < 5) {
    missing.push("At least five O-Level subject results");
  }
  if (!application.declarationAccepted) missing.push("Applicant declaration");

  const uploadedTypes = new Set(application.documents.map((document) => document.type));
  requiredDocumentTypes.forEach((type) => {
    if (!uploadedTypes.has(type)) missing.push(type.replaceAll("_", " ").toLowerCase());
  });

  if (missing.length) {
    return res.status(422).json({ success: false, message: "Complete all required application steps", data: { missing } });
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const next = await transaction.application.update({
      where: { id: application.id },
      data: { status: "SUBMITTED", submittedAt: new Date(), dateReceived: new Date() },
      include: applicantInclude()
    });
    await transaction.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: "SUBMITTED",
        note: "Application submitted for review",
        changedBy: req.user.name
      }
    });
    return next;
  });

  ok(res, updated, "Application submitted for review");
});

export const uploadApplicantDocument = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Please choose a document to upload" });
  const application = await getApplicantApplication(req.user.id);
  if (!editableStatuses.includes(application.status)) {
    return res.status(409).json({ success: false, message: "Documents cannot be changed during review" });
  }

  const metadata = fileMetadata(req.file, "documents");
  const document = await prisma.applicationDocument.create({
    data: {
      applicationId: application.id,
      type: req.body.type,
      label: req.body.label,
      path: metadata.path,
      fileType: metadata.fileType,
      fileSize: metadata.fileSize
    }
  });

  if (req.body.type === "PASSPORT") {
    await prisma.application.update({
      where: { id: application.id },
      data: {
        passportPath: metadata.path,
        passportFileType: metadata.fileType,
        passportFileSize: metadata.fileSize
      }
    });
  }

  created(res, document, "Document uploaded");
});

export const deleteApplicantDocument = asyncHandler(async (req, res) => {
  const application = await getApplicantApplication(req.user.id);
  if (!editableStatuses.includes(application.status)) {
    return res.status(409).json({ success: false, message: "Documents cannot be changed during review" });
  }
  const document = await prisma.applicationDocument.findFirst({
    where: { id: req.params.documentId, applicationId: application.id }
  });
  if (!document) return res.status(404).json({ success: false, message: "Document not found" });
  await prisma.applicationDocument.delete({ where: { id: document.id } });
  ok(res, null, "Document removed");
});

export const recordApplicantPayment = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Payment evidence is required" });
  const application = await getApplicantApplication(req.user.id);
  if (req.body.type === "APPLICATION_FEE" && application.formFeeAmount !== null && !new Prisma.Decimal(req.body.amount).equals(application.formFeeAmount)) return res.status(422).json({ success: false, message: "Record the exact form fee quoted on your account" });
  if (req.body.type === "ACCEPTANCE_FEE" && !["ACCEPTED", "ADMITTED"].includes(application.status)) return res.status(409).json({ success: false, message: "Acceptance payment is available after an admission offer" });
  if (req.body.type === "SCHOOL_FEE" && application.status !== "ADMITTED") return res.status(409).json({ success: false, message: "School-fee records are available after admission" });
  const duplicate = await prisma.payment.findFirst({ where: { reference: req.body.reference, status: { in: ["PENDING", "VERIFIED"] } } });
  if (duplicate) return res.status(409).json({ success: false, message: "This payment reference has already been recorded" });

  const metadata = fileMetadata(req.file, "documents");
  const payment = await createPendingPayment(prisma, application.id, {
      type: req.body.type,
      amount: req.body.amount,
      reference: req.body.reference,
      paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
      proofPath: metadata.path,
      proofFileType: metadata.fileType,
      proofFileSize: metadata.fileSize
  });
  created(res, payment, "Payment evidence submitted for verification");
});

export const requireNoPendingReceipt = asyncHandler(async (req, res, next) => {
  const pending = await prisma.payment.findFirst({ where: { application: { applicantId: req.user.id }, status: "PENDING" }, select: { id: true } });
  if (pending) return res.status(409).json({ success: false, message: pendingReceiptMessage });
  next();
});

export const withdrawApplicantPayment = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.paymentId, application: { applicantId: req.user.id } } });
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  if (!["PENDING", "REJECTED"].includes(payment.status)) return res.status(409).json({ success: false, message: "Only pending or rejected receipts can be removed" });
  const updated = await auditedMutation(prisma, { actorId: req.user.id, action: "payment.withdrawn", targetType: "payment", targetId: payment.id }, async (transaction) => {
    const changed = await transaction.payment.updateMany({ where: { id: payment.id, status: payment.status, updatedAt: payment.updatedAt }, data: { status: "CANCELLED", reviewNote: "Withdrawn by applicant" } });
    if (!changed.count) throw Object.assign(new Error("The payment changed during review. Refresh your history."), { statusCode: 409 });
    return transaction.payment.findUnique({ where: { id: payment.id } });
  });
  ok(res, updated, "Receipt removed. You can upload a replacement.");
});
