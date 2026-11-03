import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { toPublicUser } from "../services/authService.js";
import { assignedStudentScope, staffEnrolmentSelection } from "../services/staffRecords.js";
import { hasPermission } from "../services/permissions.js";

const router = Router();
router.use(requireAuth, requireRole("STAFF"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/me", asyncHandler(async (req, res) => {
  const studentCount = hasPermission(req.user, "advisees.read") ? await prisma.staffStudentAssignment.count({ where: assignedStudentScope(req.user.id) }) : 0;
  ok(res, { user: toPublicUser(req.user), studentCount });
}));
router.get("/students", requirePermission("advisees.read"), asyncHandler(async (req, res) => {
  const { page } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(req.query);
  const where = assignedStudentScope(req.user.id);
  const [students, total] = await prisma.$transaction([
    prisma.staffStudentAssignment.findMany({ where, select: { id: true, enrolment: { select: staffEnrolmentSelection } }, orderBy: { id: "asc" }, take: 25, skip: (page - 1) * 25 }),
    prisma.staffStudentAssignment.count({ where })
  ]);
  ok(res, { students, total, page });
}));
router.get("/students/:id", requirePermission("advisees.read"), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const record = await prisma.staffStudentAssignment.findFirst({ where: { id, ...assignedStudentScope(req.user.id) }, select: { id: true, enrolment: { select: staffEnrolmentSelection } } });
  if (!record) return res.status(404).json({ success: false, message: "Student assignment not found." });
  ok(res, record);
}));
export default router;
