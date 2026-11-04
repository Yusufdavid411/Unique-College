import { z } from "zod";
import { departmentCourseAccess } from "./academicResponsibilities.js";

export const fail = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });
export const uuid = z.string().uuid();
export const versionSchema = z.string().datetime().nullable();
export const courseDetails = { programme: { include: { department: true } }, session: true, level: true };
export async function hasAcademicResponsibility(database, user, departmentId, responsibility) {
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;
  return Boolean(await database.academicAppointment.findFirst({ where: { staffId: user.id, isActive: true, responsibility, departmentId: responsibility === "GENERAL_EXAM_OFFICER" ? null : departmentId, staff: { isActive: true } } }));
}
export async function canReviewAcademicCourse(database, user, course) {
  return await departmentCourseAccess(database, user, course.departmentId) ||
    await hasAcademicResponsibility(database, user, course.departmentId, "DEPARTMENT_EXAM_OFFICER") ||
    await hasAcademicResponsibility(database, user, null, "GENERAL_EXAM_OFFICER");
}
export function checkVersion(record, expected) {
  if ((record?.updatedAt.toISOString() || null) !== expected) throw fail("This record changed. Refresh before continuing.");
}
export async function activeEnrolment(database, userId, enrolmentId, requireActive = true) {
  const enrolment = await database.studentEnrolment.findFirst({ where: { id: enrolmentId, status: "CONFIRMED", student: { userId, user: { isActive: true, role: "STUDENT" }, application: { status: "ADMITTED" } } }, include: { programme: { include: { department: true } }, session: true, level: true } });
  if (!enrolment || requireActive && (!enrolment.programme.isActive || !enrolment.programme.department.isActive || !enrolment.session.isActive || !enrolment.level.isActive)) throw fail("Choose your active, confirmed academic assignment.", 403);
  return enrolment;
}
export function registrationScope(enrolment, semester) {
  return { programmeId: enrolment.programmeId, sessionId: enrolment.sessionId, levelId: enrolment.levelId, semester };
}
export function assertRegistrationSelection(courses, selectedIds, window) {
  if (!selectedIds.length || new Set(selectedIds).size !== selectedIds.length) throw fail("Select each course only once.", 422);
  const selected = courses.filter((course) => selectedIds.includes(course.id));
  if (selected.length !== selectedIds.length || courses.some((course) => course.category === "CORE" && !selectedIds.includes(course.id))) throw fail("Select all core courses and only available courses for this semester.", 422);
  const units = selected.reduce((sum, course) => sum + course.creditUnits, 0);
  if (units < window.minUnits || units > window.maxUnits) throw fail(`Select between ${window.minUnits} and ${window.maxUnits} credit units.`, 422);
  return selected;
}
export const questionsSchema = z.array(z.object({
  prompt: z.string().trim().min(2).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5)
}).strict().refine((question) => question.correctIndex < question.options.length, "Choose a valid correct answer.")).min(1).max(100);
export function scoreAttempt(questions, answers) {
  const correct = questions.filter((question, index) => answers[String(index)] === question.correctIndex).length;
  return Math.round(correct / questions.length * 10000) / 100;
}
export function attemptAcceptsAnswers(attempt, now = new Date()) {
  return !attempt.submittedAt && now < attempt.deadline;
}
export function publicExamQuestions(questions) {
  return questions.map(({ prompt, options }, index) => ({ id: String(index), prompt, options }));
}
export function validateAnswers(questions, answers) {
  for (const [key, value] of Object.entries(answers)) {
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= questions.length || !Number.isInteger(value) || value < 0 || value >= questions[Number(key)].options.length) throw fail("An answer is not valid for this exam.", 422);
  }
}
