import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { studentRecord, enrolmentInclude } from "../services/studentRecords.js";
import { auditedMutation } from "../services/audit.js";

const router = Router();
router.get("/", requireAuth, requirePermission("students.read"), asyncHandler(async (req, res) => {
  const { page, search } = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    search: z.string().trim().max(100).default("")
  }).parse(req.query);
  const where = {
    status: "ADMITTED", isTest: false, applicant: { is: { role: "STUDENT" } },
    ...(search ? { OR: ["fullName", "email", "studentNumber", "applicationNumber", "courseOfInterest"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
  };
  const [students, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      select: { id: true, fullName: true, email: true, applicationNumber: true, studentNumber: true, courseOfInterest: true, admittedAt: true, applicant: { select: { portalUsername: true, isActive: true, mustChangePassword: true } } },
      orderBy: [{ admittedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25
    }),
    prisma.application.count({ where })
  ]);
  res.set("Cache-Control", "no-store");
  ok(res, { students, total, page });
}));

router.get("/:id", requireAuth, requirePermission("students.read"), asyncHandler(async (req, res) => {
  const applicationId = z.string().uuid().parse(req.params.id);
  res.set("Cache-Control", "no-store");
  ok(res, await studentRecord(prisma, { applicationId }));
}));
router.post("/:id/enrolments", requireAuth, requirePermission("students.manage"), asyncHandler(async (req, res) => {
  const applicationId = z.string().uuid().parse(req.params.id);
  const data = z.object({ programmeId: z.string().uuid(), sessionId: z.string().uuid(), levelId: z.string().uuid() }).strict().parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: "student.academic_assignment", targetType: "application", targetId: applicationId }, async (database) => {
    const record = await studentRecord(database, { applicationId });
    const programme = await database.academicProgramme.findUnique({ where: { id: data.programmeId }, include: { department: true } });
    const session = await database.academicSession.findUnique({ where: { id: data.sessionId } });
    const level = await database.academicLevel.findUnique({ where: { id: data.levelId } });
    if (!programme?.isActive || !programme.department.isActive || !session?.isActive || !level?.isActive) throw Object.assign(new Error("Choose an active programme, department, session and level."), { statusCode: 422 });
    const current = await database.studentEnrolment.findUnique({ where: { studentId_sessionId: { studentId: record.id, sessionId: data.sessionId } } });
    if (current?.status === "CONFIRMED") {
      if (current.programmeId === data.programmeId && current.levelId === data.levelId) return current;
      throw Object.assign(new Error("Confirmed academic records cannot be overwritten. A formal record-correction workflow is required."), { statusCode: 409 });
    }
    return database.studentEnrolment.upsert({ where: { studentId_sessionId: { studentId: record.id, sessionId: data.sessionId } }, update: { ...data, assignedBy: req.user.id }, create: { ...data, studentId: record.id, assignedBy: req.user.id }, include: enrolmentInclude });
  }, { isolationLevel: "Serializable", timeout: 15000 });
  res.set("Cache-Control", "no-store");
  ok(res, result, "Academic assignment saved.");
}));
export default router;
