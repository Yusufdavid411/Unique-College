import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { auditedMutation } from "../services/audit.js";
import { departmentCourseAccess, responsibilities } from "../services/academicResponsibilities.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "STAFF"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const id = z.string().uuid();
const includes = { department: true, programme: true, session: true, level: true };
const denied = () => Object.assign(new Error("Only the department's appointed HOD or an administrator can manage these courses."), { statusCode: 403 });

router.get("/workspace", asyncHandler(async (req, res) => {
  const admin = req.user.role === "ADMIN";
  const appointments = await prisma.academicAppointment.findMany({
    where: admin ? {} : { staffId: req.user.id, isActive: true },
    include: { staff: { select: { id: true, name: true, isActive: true } }, department: true }, orderBy: { createdAt: "desc" }, take: 1000
  });
  const departmentIds = appointments.filter((item) => item.isActive && item.responsibility === "HOD").map((item) => item.departmentId);
  const [departments, programmes, sessions, levels, staff] = await Promise.all([
    prisma.academicDepartment.findMany({ where: admin ? {} : { id: { in: departmentIds } }, orderBy: { name: "asc" } }),
    prisma.academicProgramme.findMany({ where: admin ? {} : { departmentId: { in: departmentIds } }, orderBy: { name: "asc" } }),
    prisma.academicSession.findMany({ orderBy: { startsAt: "desc" } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" } }),
    admin ? prisma.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : []
  ]);
  ok(res, { appointments, departments, programmes, sessions, levels, staff });
}));

router.post("/appointments", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const data = z.object({ staffId: id, departmentId: id.nullable(), responsibility: z.enum(responsibilities) }).strict()
    .refine((entry) => entry.responsibility === "GENERAL_EXAM_OFFICER" ? entry.departmentId === null : Boolean(entry.departmentId), "Choose a department for department responsibilities.").parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: "academic.appointment_created", targetType: "academic_appointment" }, async (database) => {
    const staff = await database.user.findUnique({ where: { id: data.staffId } });
    if (!staff?.isActive || staff.role !== "STAFF") throw Object.assign(new Error("Select an active staff account."), { statusCode: 422 });
    if (data.departmentId && !(await database.academicDepartment.findUnique({ where: { id: data.departmentId } }))?.isActive) throw Object.assign(new Error("Select an active department."), { statusCode: 422 });
    const current = await database.academicAppointment.findFirst({ where: { departmentId: data.departmentId, responsibility: data.responsibility, isActive: true } });
    if (current) throw Object.assign(new Error("End the current appointment before assigning its replacement."), { statusCode: 409 });
    return database.academicAppointment.create({ data: { ...data, assignedBy: req.user.id } });
  }, { isolationLevel: "Serializable" });
  ok(res, result, "Responsibility assigned.");
}));

router.delete("/appointments/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const appointmentId = id.parse(req.params.id);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: "academic.appointment_ended", targetType: "academic_appointment", targetId: appointmentId },
    (database) => database.academicAppointment.update({ where: { id: appointmentId }, data: { isActive: false, endedAt: new Date() } }));
  ok(res, result, "Appointment ended. Historical actions are retained.");
}));

router.get("/courses", asyncHandler(async (req, res) => {
  const filter = z.object({ departmentId: id, sessionId: id, levelId: id }).parse(req.query);
  if (!await departmentCourseAccess(prisma, req.user, filter.departmentId)) throw denied();
  ok(res, await prisma.academicCourse.findMany({ where: filter, include: includes, orderBy: [{ semester: "asc" }, { code: "asc" }], take: 500 }));
}));

router.post("/courses", asyncHandler(async (req, res) => {
  const data = z.object({
    departmentId: id, programmeId: id, sessionId: id, levelId: id, semester: z.number().int().min(1).max(2),
    code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9 -]+$/)),
    title: z.string().trim().min(2).max(200), creditUnits: z.number().int().min(1).max(30), category: z.enum(["CORE", "ELECTIVE"])
  }).strict().parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: "academic.course_created", targetType: "academic_course" }, async (database) => {
    if (!await departmentCourseAccess(database, req.user, data.departmentId)) throw denied();
    const [programme, session, level] = await Promise.all([
      database.academicProgramme.findUnique({ where: { id: data.programmeId }, include: { department: true } }),
      database.academicSession.findUnique({ where: { id: data.sessionId } }),
      database.academicLevel.findUnique({ where: { id: data.levelId } })
    ]);
    if (!programme?.isActive || !programme.department.isActive || programme.departmentId !== data.departmentId || !session?.isActive || !level?.isActive) throw Object.assign(new Error("Choose active academic records in this department."), { statusCode: 422 });
    return database.academicCourse.create({ data: { ...data, createdBy: req.user.id } });
  }, { isolationLevel: "Serializable" });
  ok(res, result, "Draft course created.");
}));

router.patch("/courses/:id", asyncHandler(async (req, res) => {
  const courseId = id.parse(req.params.id);
  const data = z.object({ published: z.boolean() }).strict().parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: data.published ? "academic.course_published" : "academic.course_unpublished", targetType: "academic_course", targetId: courseId }, async (database) => {
    const course = await database.academicCourse.findUnique({ where: { id: courseId }, include: includes });
    if (!course) throw Object.assign(new Error("Course not found."), { statusCode: 404 });
    if (!await departmentCourseAccess(database, req.user, course.departmentId)) throw denied();
    if (data.published && (!course.department.isActive || !course.programme.isActive || !course.session.isActive || !course.level.isActive)) throw Object.assign(new Error("The academic records must be active before publishing."), { statusCode: 409 });
    return database.academicCourse.update({ where: { id: courseId }, data });
  }, { isolationLevel: "Serializable" });
  ok(res, result);
}));
export default router;
