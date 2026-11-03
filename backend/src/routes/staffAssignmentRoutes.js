import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditedMutation } from "../services/audit.js";
import { ok } from "../utils/apiResponse.js";
import { hasPermission, roleInclude } from "../services/permissions.js";
import { staffEnrolmentSelection } from "../services/staffRecords.js";

const router = Router();
router.use(requireAuth, requirePermission("staff.assignments.manage"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/", asyncHandler(async (req, res) => {
  const { page } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(req.query);
  const [assignments, total] = await prisma.$transaction([
    prisma.staffStudentAssignment.findMany({ where: { isActive: true }, include: { staff: { select: { name: true, email: true } }, enrolment: { select: staffEnrolmentSelection } }, orderBy: { createdAt: "desc" }, take: 25, skip: (page - 1) * 25 }),
    prisma.staffStudentAssignment.count({ where: { isActive: true } })
  ]);
  ok(res, { assignments, total, page });
}));
router.get("/options", asyncHandler(async (req, res) => {
  const { search } = z.object({ search: z.string().trim().max(100).default("") }).parse(req.query);
  const staff = await prisma.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, name: true, email: true, role: true, isActive: true, ...roleInclude }, take: 100, orderBy: { name: "asc" } });
  const enrolments = await prisma.studentEnrolment.findMany({ where: { session: { isActive: true }, student: { user: { role: "STUDENT", isActive: true, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) }, application: { status: "ADMITTED", isTest: false } } }, select: staffEnrolmentSelection, take: 25, orderBy: { id: "asc" } });
  ok(res, { staff: staff.filter((person) => hasPermission(person, "advisees.read")).map(({ id, name, email }) => ({ id, name, email })), enrolments });
}));
router.post("/", asyncHandler(async (req, res) => {
  const data = z.object({ staffId: z.string().uuid(), enrolmentId: z.string().uuid() }).strict().parse(req.body);
  const record = await auditedMutation(prisma, { actorId: req.user.id, action: "staff.student_assigned", targetType: "staff_assignment" }, async (database) => {
    const staff = await database.user.findUnique({ where: { id: data.staffId }, include: roleInclude });
    const enrolment = await database.studentEnrolment.findUnique({ where: { id: data.enrolmentId }, include: { session: true, student: { include: { user: true, application: true } } } });
    if (staff?.role !== "STAFF" || !hasPermission(staff, "advisees.read")) throw Object.assign(new Error("Choose active staff with the assigned-students permission."), { statusCode: 422 });
    if (!enrolment?.session.isActive || !enrolment.student.user.isActive || enrolment.student.user.role !== "STUDENT" || enrolment.student.application.status !== "ADMITTED") throw Object.assign(new Error("Choose an admitted student with an active academic-session assignment."), { statusCode: 422 });
    return database.staffStudentAssignment.upsert({ where: { staffId_enrolmentId: data }, create: { ...data, assignedBy: req.user.id }, update: { isActive: true, assignedBy: req.user.id } });
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, record, "Adviser assigned. Access is limited to this student and academic session.");
}));
router.delete("/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await auditedMutation(prisma, { actorId: req.user.id, action: "staff.student_unassigned", targetType: "staff_assignment", targetId: id }, (database) => database.staffStudentAssignment.update({ where: { id }, data: { isActive: false } }));
  ok(res, null, "Assignment removed. Student history is retained.");
}));
export default router;
