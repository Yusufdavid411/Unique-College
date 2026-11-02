import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditedMutation } from "../services/audit.js";
import { studentRecord, enrolmentInclude } from "../services/studentRecords.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();
router.use(requireAuth, requireRole("STUDENT"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.use(asyncHandler(async (req, res, next) => {
  const membership = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, select: { id: true, userId: true, application: { select: { status: true, applicantId: true } } } });
  if (!membership || membership.application.status !== "ADMITTED" || membership.application.applicantId !== req.user.id) return res.status(404).json({ success: false, message: "Student record unavailable. Contact the registry." });
  req.studentId = membership.id;
  next();
}));
router.get("/me", asyncHandler(async (req, res) => ok(res, await studentRecord(prisma, { userId: req.user.id }))));
router.patch("/profile", asyncHandler(async (req, res) => {
  const text = (maximum) => z.string().trim().max(maximum);
  const data = z.object({ version: z.string().datetime(), phoneNumber: z.string().trim().min(7).max(30).regex(/^[+\d\s()-]+$/), address: text(500), guardianName: text(150), guardianRelationship: text(100), guardianPhone: z.string().trim().max(30).refine((value) => !value || /^[+\d\s()-]{7,30}$/.test(value), "Enter a valid contact number"), guardianAddress: text(500) }).strict().parse(req.body);
  const { version, ...changes } = data;
  await auditedMutation(prisma, { actorId: req.user.id, action: "student.profile_updated", targetType: "student", targetId: req.studentId }, async (database) => {
    const changed = await database.studentProfile.updateMany({ where: { id: req.studentId, userId: req.user.id, updatedAt: new Date(version) }, data: changes });
    if (!changed.count) throw Object.assign(new Error("Your profile changed. Refresh before saving again."), { statusCode: 409 });
    return changed;
  });
  ok(res, await studentRecord(prisma, { userId: req.user.id }), "Contact details updated.");
}));
router.post("/enrolments/:id/confirm", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { version } = z.object({ declaration: z.literal(true), version: z.string().datetime() }).strict().parse(req.body);
  await auditedMutation(prisma, { actorId: req.user.id, action: "student.academic_details_confirmed", targetType: "enrolment", targetId: id }, async (database) => {
    const enrolment = await database.studentEnrolment.findFirst({ where: { id, studentId: req.studentId }, include: enrolmentInclude });
    if (!enrolment) throw Object.assign(new Error("Academic record not found"), { statusCode: 404 });
    if (enrolment.status === "CONFIRMED") return enrolment;
    if (enrolment.updatedAt.toISOString() !== version) throw Object.assign(new Error("Your academic assignment changed. Review the updated details before confirming."), { statusCode: 409 });
    if (!enrolment.programme.isActive || !enrolment.programme.department.isActive || !enrolment.session.isActive || !enrolment.level.isActive) throw Object.assign(new Error("This academic assignment is not available for confirmation. Contact the registry."), { statusCode: 409 });
    const changed = await database.studentEnrolment.updateMany({ where: { id, studentId: req.studentId, status: "ASSIGNED", updatedAt: enrolment.updatedAt }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    if (!changed.count) throw Object.assign(new Error("The assignment changed. Refresh before confirming."), { statusCode: 409 });
    return changed;
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, await studentRecord(prisma, { userId: req.user.id }), "Academic details confirmed. This is not course registration or financial clearance.");
}));
router.get("/announcements", asyncHandler(async (req, res) => {
  const { page } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(req.query);
  const where = { isPublished: true };
  const [items, total] = await prisma.$transaction([prisma.studentAnnouncement.findMany({ where, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 10, take: 10 }), prisma.studentAnnouncement.count({ where })]);
  ok(res, { items: items.map(({ id, title, body, publishedAt }) => ({ id, title, excerpt: body.slice(0, 180), publishedAt })), total, page });
}));
router.get("/announcements/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const item = await prisma.studentAnnouncement.findFirst({ where: { id, isPublished: true } });
  if (!item) return res.status(404).json({ success: false, message: "Announcement not found" });
  ok(res, item);
}));
export default router;
