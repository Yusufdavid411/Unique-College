import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileMetadata } from "../services/uploadService.js";

export const createApplication = asyncHandler(async (req, res) => {
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
    orderBy: { createdAt: "desc" }
  });

  ok(res, applications);
});

export const getApplication = asyncHandler(async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!application) {
    return res.status(404).json({ success: false, message: "Application not found" });
  }
  ok(res, application);
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      reviewNote: req.body.reviewNote || null
    }
  });

  ok(res, application, "Application status updated");
});
