import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileMetadata } from "../services/uploadService.js";

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
  ok(res, application);
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const current = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { applicant: true }
  });
  if (!current) return res.status(404).json({ success: false, message: "Application not found" });

  let credentials = null;
  let passwordHash = null;
  const data = {
    status: req.body.status,
    reviewNote: req.body.reviewNote || null,
    interviewDate: req.body.interviewDate ? new Date(req.body.interviewDate) : null,
    entranceExamScore: req.body.entranceExamScore,
    interviewScore: req.body.interviewScore,
    dateResumed: req.body.dateResumed ? new Date(req.body.dateResumed) : null
  };

  if (req.body.status === "ADMITTED" && current.applicant && current.status !== "ADMITTED") {
    credentials = studentCredentials(current);
    data.studentNumber = credentials.studentNumber;
    data.admittedAt = new Date();
    passwordHash = await bcrypt.hash(credentials.temporaryPassword, 12);
  }

  const application = await prisma.$transaction(async (transaction) => {
    if (credentials) {
      await transaction.user.update({
        where: { id: current.applicant.id },
        data: {
          role: "STUDENT",
          portalUsername: credentials.portalUsername,
          officialEmail: credentials.officialEmail,
          passwordHash,
          mustChangePassword: true
        }
      });
    }
    const updated = await transaction.application.update({
      where: { id: req.params.id },
      data,
      include: applicationDetails
    });
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

  ok(res, { application, credentials }, credentials ? "Applicant admitted and student credentials created" : "Application status updated");
});

export const reviewApplicationDocument = asyncHandler(async (req, res) => {
  const document = await prisma.applicationDocument.findFirst({
    where: { id: req.params.documentId, applicationId: req.params.id }
  });
  if (!document) return res.status(404).json({ success: false, message: "Document not found" });
  const updated = await prisma.applicationDocument.update({
    where: { id: document.id },
    data: { reviewStatus: req.body.reviewStatus, reviewNote: req.body.reviewNote || null }
  });
  ok(res, updated, "Document review updated");
});

export const reviewApplicationPayment = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.paymentId, applicationId: req.params.id }
  });
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: req.body.status,
      reviewNote: req.body.reviewNote || null,
      verifiedAt: req.body.status === "VERIFIED" ? new Date() : null
    }
  });
  ok(res, updated, "Payment review updated");
});

export const deleteApplication = asyncHandler(async (req, res) => {
  await prisma.application.delete({ where: { id: req.params.id } });
  ok(res, null, "Application deleted");
});
