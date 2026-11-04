import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { auditedMutation } from "../services/audit.js";
import { departmentCourseAccess } from "../services/academicResponsibilities.js";
import { courseRegistrationPdf } from "../services/courseRegistrationPdf.js";
import { fail, uuid, versionSchema, courseDetails, hasAcademicResponsibility, canReviewAcademicCourse, checkVersion, activeEnrolment, registrationScope, assertRegistrationSelection } from "../services/academicFlow.js";

const router = Router();
router.use(requireAuth, (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const staff = requireRole("ADMIN", "STAFF");
const student = requireRole("STUDENT");
const semesterSchema = z.number().int().min(1).max(2);
const registrationInclude = { items: true, enrolment: { include: { programme: true, session: true, level: true, student: { select: { user: { select: { name: true } }, application: { select: { studentNumber: true } } } } } } };

router.get("/student/registration", student, asyncHandler(async (req, res) => {
  const enrolmentId = uuid.parse(req.query.enrolmentId);
  const semester = z.coerce.number().int().min(1).max(2).parse(req.query.semester);
  const enrolment = await activeEnrolment(prisma, req.user.id, enrolmentId, false);
  const scope = registrationScope(enrolment, semester);
  const [window, courses, registration] = await Promise.all([
    prisma.courseRegistrationWindow.findUnique({ where: { programmeId_sessionId_levelId_semester: scope } }),
    prisma.academicCourse.findMany({ where: { ...scope, published: true }, orderBy: { code: "asc" } }),
    prisma.courseRegistration.findUnique({ where: { enrolmentId_semester: { enrolmentId, semester } }, include: { items: true } })
  ]);
  ok(res, { window, courses, registration, serverTime: new Date() });
}));
router.post("/student/registration", student, asyncHandler(async (req, res) => {
  const input = z.object({ enrolmentId: uuid, semester: semesterSchema, courseIds: z.array(uuid).min(1).max(100), version: versionSchema }).strict().parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: "course_registration.submitted", targetType: "course_registration" }, async (database) => {
    const enrolment = await activeEnrolment(database, req.user.id, input.enrolmentId);
    const scope = registrationScope(enrolment, input.semester);
    const window = await database.courseRegistrationWindow.findUnique({ where: { programmeId_sessionId_levelId_semester: scope } });
    const now = new Date();
    if (!window || now < window.opensAt || now > window.closesAt) throw fail("Course registration is not open for this semester.");
    const courses = await database.academicCourse.findMany({ where: { ...scope, published: true } });
    const selected = assertRegistrationSelection(courses, input.courseIds, window);
    const current = await database.courseRegistration.findUnique({ where: { enrolmentId_semester: { enrolmentId: input.enrolmentId, semester: input.semester } } });
    checkVersion(current, input.version);
    if (current && current.status !== "RETURNED") throw fail("This registration has already been submitted. Contact the HOD for corrections.");
    if (current) await database.courseRegistrationItem.deleteMany({ where: { registrationId: current.id } });
    const items = selected.map(({ id, code, title, creditUnits }) => ({ courseId: id, code, title, creditUnits }));
    return current ? database.courseRegistration.update({ where: { id: current.id }, data: { status: "SUBMITTED", reviewNote: null, reviewedBy: null, reviewedAt: null, submittedAt: now, items: { create: items } }, include: { items: true } })
      : database.courseRegistration.create({ data: { enrolmentId: input.enrolmentId, semester: input.semester, items: { create: items } }, include: { items: true } });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 });
  ok(res, result, "Courses submitted for HOD approval.");
}));

router.get("/student/registrations/:id/pdf", student, asyncHandler(async (req, res) => {
  const registration = await prisma.courseRegistration.findFirst({ where: { id: uuid.parse(req.params.id), status: "APPROVED", enrolment: { student: { userId: req.user.id, application: { status: "ADMITTED" } } } }, include: registrationInclude });
  if (!registration) throw fail("Approved course registration not found.", 404);
  res.type("application/pdf").attachment("approved-course-registration.pdf").send(Buffer.from(await courseRegistrationPdf(registration)));
}));

router.get("/workspace", staff, asyncHandler(async (req, res) => {
  const filter = z.object({ departmentId: uuid, sessionId: uuid, levelId: uuid }).parse(req.query);
  const scopeCourse = { departmentId: filter.departmentId };
  if (!await canReviewAcademicCourse(prisma, req.user, scopeCourse)) throw fail("This department is not assigned to you.", 403);
  const [courses, registrations, windows] = await Promise.all([
    prisma.academicCourse.findMany({ where: filter, include: { resultBatch: { select: { id: true, status: true, updatedAt: true } } }, orderBy: { code: "asc" }, take: 500 }),
    prisma.courseRegistration.findMany({ where: { enrolment: { sessionId: filter.sessionId, levelId: filter.levelId, programme: { departmentId: filter.departmentId } } }, include: registrationInclude, orderBy: { submittedAt: "desc" }, take: 200 }),
    prisma.courseRegistrationWindow.findMany({ where: { sessionId: filter.sessionId, levelId: filter.levelId, programmeId: { in: (await prisma.academicProgramme.findMany({ where: { departmentId: filter.departmentId }, select: { id: true } })).map(({ id }) => id) } } })
  ]);
  ok(res, { courses, registrations, windows, canManage: await departmentCourseAccess(prisma, req.user, filter.departmentId) });
}));
router.put("/windows", staff, asyncHandler(async (req, res) => {
  const data = z.object({ programmeId: uuid, sessionId: uuid, levelId: uuid, semester: semesterSchema, opensAt: z.string().datetime(), closesAt: z.string().datetime(), minUnits: z.number().int().min(0).max(100), maxUnits: z.number().int().min(1).max(100) }).strict().refine((item) => item.closesAt > item.opensAt && item.maxUnits >= item.minUnits, "Check the registration dates and unit limits.").parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "course_registration.window_configured", targetType: "course_registration_window" }, async (database) => {
    const programme = await database.academicProgramme.findUnique({ where: { id: data.programmeId }, include: { department: true } });
    if (!programme?.isActive || !programme.department.isActive || !await departmentCourseAccess(database, req.user, programme.departmentId)) throw fail("Choose an active programme in your department.", 403);
    if (!(await database.academicSession.findUnique({ where: { id: data.sessionId } }))?.isActive || !(await database.academicLevel.findUnique({ where: { id: data.levelId } }))?.isActive) throw fail("Choose an active session and level.", 422);
    const scope = { programmeId: data.programmeId, sessionId: data.sessionId, levelId: data.levelId, semester: data.semester };
    return database.courseRegistrationWindow.upsert({ where: { programmeId_sessionId_levelId_semester: scope }, create: data, update: data });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
router.patch("/registrations/:id", staff, asyncHandler(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const input = z.object({ status: z.enum(["APPROVED", "RETURNED"]), note: z.string().trim().max(1000).default(""), version: z.string().datetime() }).strict().refine((item) => item.status !== "RETURNED" || item.note.length >= 5, "Explain the corrections required.").parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "course_registration." + input.status.toLowerCase(), targetType: "course_registration", targetId: id }, async (database) => {
    const registration = await database.courseRegistration.findUnique({ where: { id }, include: registrationInclude });
    if (!registration || !await departmentCourseAccess(database, req.user, registration.enrolment.programme.departmentId)) throw fail("Registration not found in your department.", 404);
    checkVersion(registration, input.version);
    if (registration.status !== "SUBMITTED") throw fail("Only submitted registrations can be reviewed.");
    return database.courseRegistration.update({ where: { id }, data: { status: input.status, reviewNote: input.note || null, reviewedBy: req.user.id, reviewedAt: new Date() } });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));

router.get("/courses/:id/results", staff, asyncHandler(async (req, res) => {
  const course = await prisma.academicCourse.findUnique({ where: { id: uuid.parse(req.params.id) } });
  if (!course || !await canReviewAcademicCourse(prisma, req.user, course)) throw fail("Course not found in your scope.", 404);
  const [items, batch] = await Promise.all([
    prisma.courseRegistrationItem.findMany({ where: { courseId: course.id, registration: { status: "APPROVED" } }, include: { registration: { include: { enrolment: { include: { student: { include: { user: { select: { name: true } }, application: { select: { studentNumber: true } } } } } } } } }, orderBy: { id: "asc" }, take: 500 }),
    prisma.courseResultBatch.findUnique({ where: { courseId: course.id }, include: { entries: true } })
  ]);
  const editable = await departmentCourseAccess(prisma, req.user, course.departmentId);
  const action = !batch ? null : batch.status === "DRAFT" && editable ? "SUBMIT"
    : batch.status === "DEPARTMENT_REVIEW" && await hasAcademicResponsibility(prisma, req.user, course.departmentId, "DEPARTMENT_EXAM_OFFICER") ? "FORWARD"
      : batch.status === "GENERAL_REVIEW" && await hasAcademicResponsibility(prisma, req.user, null, "GENERAL_EXAM_OFFICER") ? "PUBLISH" : null;
  ok(res, { course, batch, editable, action, students: items.map((item) => ({ id: item.id, name: item.registration.enrolment.student.user.name, studentNumber: item.registration.enrolment.student.application.studentNumber })) });
}));
router.put("/courses/:id/results", staff, asyncHandler(async (req, res) => {
  const courseId = uuid.parse(req.params.id);
  const input = z.object({ version: versionSchema, scores: z.array(z.object({ registrationItemId: uuid, score: z.number().finite().min(0).max(100).multipleOf(0.01) }).strict()).min(1).max(500) }).strict().parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "results.draft_saved", targetType: "result_batch" }, async (database) => {
    const course = await database.academicCourse.findUnique({ where: { id: courseId } });
    if (!course || !await departmentCourseAccess(database, req.user, course.departmentId)) throw fail("Only the course department's HOD may upload results.", 403);
    const current = await database.courseResultBatch.findUnique({ where: { courseId } });
    checkVersion(current, input.version);
    if (current && current.status !== "DRAFT") throw fail("Submitted or published results cannot be overwritten.");
    const items = await database.courseRegistrationItem.findMany({ where: { courseId, registration: { status: "APPROVED" } }, select: { id: true } });
    if (new Set(input.scores.map((item) => item.registrationItemId)).size !== input.scores.length || items.length !== input.scores.length || input.scores.some((item) => !items.some(({ id }) => id === item.registrationItemId))) throw fail("Supply one score for every approved registered student in this course.", 422);
    if (current) await database.courseResultEntry.deleteMany({ where: { batchId: current.id } });
    return current ? database.courseResultBatch.update({ where: { id: current.id }, data: { entries: { create: input.scores } }, include: { entries: true } })
      : database.courseResultBatch.create({ data: { courseId, createdBy: req.user.id, entries: { create: input.scores } }, include: { entries: true } });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
router.post("/results/:id/transition", staff, asyncHandler(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const input = z.object({ action: z.enum(["SUBMIT", "FORWARD", "PUBLISH", "RETURN"]), note: z.string().trim().max(1000).default(""), version: z.string().datetime() }).strict().parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "results." + input.action.toLowerCase(), targetType: "result_batch", targetId: id }, async (database) => {
    const batch = await database.courseResultBatch.findUnique({ where: { id }, include: { course: true, entries: true } });
    if (!batch) throw fail("Result batch not found.", 404);
    checkVersion(batch, input.version);
    const stage = { DRAFT: ["SUBMIT", "HOD", "DEPARTMENT_REVIEW"], DEPARTMENT_REVIEW: ["FORWARD", "DEPARTMENT_EXAM_OFFICER", "GENERAL_REVIEW"], GENERAL_REVIEW: ["PUBLISH", "GENERAL_EXAM_OFFICER", "PUBLISHED"] }[batch.status];
    if (!stage || !await hasAcademicResponsibility(database, req.user, batch.course.departmentId, stage[1])) throw fail("You cannot act on this result stage.", 403);
    if (input.action !== stage[0] && !(input.action === "RETURN" && batch.status !== "DRAFT" && input.note.length >= 5)) throw fail("Choose the next stage or supply a reason to return the results.");
    if (input.action !== "RETURN") {
      const expected = await database.courseRegistrationItem.count({ where: { courseId: batch.courseId, registration: { status: "APPROVED" } } });
      if (!expected || expected !== batch.entries.length) throw fail("The approved class list changed. Refresh and complete every score.");
    }
    const next = input.action === "RETURN" ? "DRAFT" : stage[2];
    const history = [...(Array.isArray(batch.history) ? batch.history : []), { actorId: req.user.id, action: input.action, from: batch.status, to: next, note: input.note, at: new Date().toISOString() }];
    return database.courseResultBatch.update({ where: { id }, data: { status: next, history, reviewNote: input.note || null, ...(next === "PUBLISHED" ? { publishedAt: new Date() } : {}) } });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
router.get("/student/results", student, asyncHandler(async (req, res) => {
  const enrolmentId = uuid.parse(req.query.enrolmentId);
  await activeEnrolment(prisma, req.user.id, enrolmentId, false);
  ok(res, await prisma.courseResultEntry.findMany({ where: { registrationItem: { registration: { enrolmentId, status: "APPROVED" } }, batch: { status: "PUBLISHED" } },
    select: { id: true, score: true, batch: { select: { publishedAt: true } }, registrationItem: { select: { code: true, title: true, creditUnits: true, registration: { select: { semester: true } } } } }, orderBy: { id: "asc" } }));
}));
export default router;
