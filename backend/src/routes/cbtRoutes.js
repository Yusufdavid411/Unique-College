import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditedMutation } from "../services/audit.js";
import { ok } from "../utils/apiResponse.js";
import { departmentCourseAccess } from "../services/academicResponsibilities.js";
import { uuid, fail, questionsSchema, validateAnswers, scoreAttempt, publicExamQuestions, attemptAcceptsAnswers } from "../services/academicFlow.js";

const router = Router();
router.use(requireAuth, (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const staff = requireRole("ADMIN", "STAFF");
const student = requireRole("STUDENT");
const examSelect = { id: true, courseId: true, title: true, startsAt: true, endsAt: true, durationMinutes: true, status: true, resultsReleased: true, updatedAt: true };
const studentItemScope = (userId) => ({ registration: { status: "APPROVED", enrolment: { status: "CONFIRMED", student: { userId, application: { status: "ADMITTED" } } } } });

router.get("/course/:id", staff, asyncHandler(async (req, res) => {
  const course = await prisma.academicCourse.findUnique({ where: { id: uuid.parse(req.params.id) } });
  if (!course || !await departmentCourseAccess(prisma, req.user, course.departmentId)) throw fail("Course not found in your department.", 404);
  ok(res, await prisma.cbtExam.findMany({ where: { courseId: course.id }, select: examSelect, orderBy: { startsAt: "desc" } }));
}));
router.post("/exams", staff, asyncHandler(async (req, res) => {
  const data = z.object({ courseId: uuid, title: z.string().trim().min(3).max(200), startsAt: z.string().datetime(), endsAt: z.string().datetime(), durationMinutes: z.number().int().min(1).max(240), questions: questionsSchema }).strict()
    .refine((exam) => Date.parse(exam.startsAt) > Date.now() && Date.parse(exam.endsAt) - Date.parse(exam.startsAt) >= exam.durationMinutes * 60000, "Choose a future exam window that accommodates the exam duration.").parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "cbt.draft_created", targetType: "cbt_exam" }, async (database) => {
    const course = await database.academicCourse.findUnique({ where: { id: data.courseId } });
    if (!course || !course.published || !await departmentCourseAccess(database, req.user, course.departmentId)) throw fail("Choose a published course in your department.", 403);
    return database.cbtExam.create({ data: { ...data, createdBy: req.user.id }, select: examSelect });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
router.patch("/exams/:id", staff, asyncHandler(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const input = z.object({ action: z.enum(["PUBLISH", "CANCEL", "RELEASE_RESULTS"]), version: z.string().datetime() }).strict().parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "cbt." + input.action.toLowerCase(), targetType: "cbt_exam", targetId: id }, async (database) => {
    const exam = await database.cbtExam.findUnique({ where: { id }, include: { course: true } });
    if (!exam || !await departmentCourseAccess(database, req.user, exam.course.departmentId)) throw fail("Exam not found in your department.", 404);
    if (exam.updatedAt.toISOString() !== input.version) throw fail("Exam changed. Refresh before continuing.");
    if (input.action === "PUBLISH" && (exam.status !== "DRAFT" || exam.startsAt <= new Date())) throw fail("Only future draft exams can be published.");
    if (input.action === "RELEASE_RESULTS" && (exam.status !== "PUBLISHED" || exam.endsAt > new Date())) throw fail("Wait until the exam closes before releasing results.");
    if (input.action === "CANCEL" && (exam.status === "CANCELLED" || await database.cbtAttempt.count({ where: { examId: id } }))) throw fail("An exam with attempts cannot be cancelled.");
    return database.cbtExam.update({ where: { id }, data: input.action === "RELEASE_RESULTS" ? { resultsReleased: true } : { status: input.action === "PUBLISH" ? "PUBLISHED" : "CANCELLED" }, select: examSelect });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
router.get("/student/exams", student, asyncHandler(async (req, res) => {
  const items = await prisma.courseRegistrationItem.findMany({ where: studentItemScope(req.user.id), select: { courseId: true } });
  ok(res, await prisma.cbtExam.findMany({ where: { courseId: { in: items.map((item) => item.courseId) }, status: "PUBLISHED" }, select: { ...examSelect, course: { select: { code: true, title: true } }, attempts: { where: { registrationItem: studentItemScope(req.user.id) }, select: { id: true, submittedAt: true, deadline: true } } }, orderBy: { startsAt: "desc" }, take: 100 }));
}));
router.post("/student/exams/:id/start", student, asyncHandler(async (req, res) => {
  const examId = uuid.parse(req.params.id);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "cbt.attempt_started", targetType: "cbt_attempt" }, async (database) => {
    const exam = await database.cbtExam.findUnique({ where: { id: examId } });
    const item = exam && await database.courseRegistrationItem.findFirst({ where: { courseId: exam.courseId, ...studentItemScope(req.user.id) } });
    if (!exam || !item || exam.status !== "PUBLISHED") throw fail("This exam is not available to your registered courses.", 403);
    const existing = await database.cbtAttempt.findUnique({ where: { examId_registrationItemId: { examId, registrationItemId: item.id } } });
    if (existing) return { id: existing.id };
    const now = new Date();
    if (now < exam.startsAt || now >= exam.endsAt) throw fail("This exam is not currently open.");
    const deadline = new Date(Math.min(exam.endsAt.getTime(), now.getTime() + exam.durationMinutes * 60000));
    return database.cbtAttempt.create({ data: { examId, registrationItemId: item.id, deadline }, select: { id: true } });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
async function ownedAttempt(database, id, userId) {
  const attempt = await database.cbtAttempt.findFirst({ where: { id, registrationItem: studentItemScope(userId) }, include: { exam: true } });
  if (!attempt || attempt.exam.status !== "PUBLISHED") throw fail("Attempt not found.", 404);
  return attempt;
}
async function attemptResponse(database, id, userId) {
  const attempt = await ownedAttempt(database, id, userId);
  let submittedAt = attempt.submittedAt;
  const now = new Date();
  if (!submittedAt && now >= attempt.deadline) {
    await database.cbtAttempt.updateMany({ where: { id, submittedAt: null }, data: { submittedAt: now, score: scoreAttempt(attempt.exam.questions, attempt.answers) } });
    submittedAt = now;
  }
  return { id, title: attempt.exam.title, deadline: attempt.deadline, serverTime: now, submittedAt, answers: attempt.answers, version: attempt.updatedAt,
    questions: submittedAt ? [] : publicExamQuestions(attempt.exam.questions),
    score: submittedAt && attempt.exam.resultsReleased ? scoreAttempt(attempt.exam.questions, attempt.answers) : null };
}
router.get("/student/attempts/:id", student, asyncHandler(async (req, res) => {
  const id = uuid.parse(req.params.id);
  ok(res, await prisma.$transaction((database) => attemptResponse(database, id, req.user.id), { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
router.put("/student/attempts/:id", student, rateLimit({ windowMs: 60000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }), asyncHandler(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const input = z.object({ answers: z.record(z.number().int()), submit: z.boolean(), version: z.string().datetime() }).strict().parse(req.body);
  ok(res, await prisma.$transaction(async (database) => {
    const attempt = await ownedAttempt(database, id, req.user.id);
    if (attemptAcceptsAnswers(attempt)) {
      if (attempt.updatedAt.toISOString() !== input.version) throw fail("This attempt changed in another tab. Reload it before continuing.");
      validateAnswers(attempt.exam.questions, input.answers);
      await database.cbtAttempt.update({ where: { id }, data: { answers: input.answers, ...(input.submit ? { submittedAt: new Date(), score: scoreAttempt(attempt.exam.questions, input.answers) } : {}) } });
      if (input.submit) await database.auditLog.create({ data: { actorId: req.user.id, action: "cbt.attempt_submitted", targetType: "cbt_attempt", targetId: id } });
    }
    return attemptResponse(database, id, req.user.id);
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 25000 }));
}));
export default router;
