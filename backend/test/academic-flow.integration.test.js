import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("course registration, layered results and timed CBT persist without cross-user leakage", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 600000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  const users = [];
  let department, programme, session, level, application, profile, enrolment, course;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (path, user, method = "GET", data) => fetch(base + path, { method, headers: { Authorization: "Bearer " + jwt.sign({ sub: user.id, version: user.sessionVersion }, env.jwtSecret), "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const success = async (response, status = 200) => { const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data.data; };
  async function user(role, suffix) {
    const record = await prisma.user.create({ data: { role, name: suffix, email: marker + "-" + suffix + "@example.invalid", passwordHash: "not-used" } });
    users.push(record); return record;
  }
  try {
    const admin = await user("ADMIN", "admin");
    const hod = await user("STAFF", "hod");
    const officer = await user("STAFF", "department-officer");
    const general = await user("STAFF", "general-officer");
    const stranger = await user("STAFF", "stranger");
    const student = await user("STUDENT", "student");
    const otherStudent = await user("STUDENT", "other-student");
    department = await prisma.academicDepartment.create({ data: { code: marker, name: marker } });
    programme = await prisma.academicProgramme.create({ data: { code: marker, name: marker, departmentId: department.id } });
    session = await prisma.academicSession.create({ data: { name: marker, startsAt: new Date("2035-01-01"), endsAt: new Date("2035-12-31") } });
    level = await prisma.academicLevel.create({ data: { code: marker, name: marker } });
    for (const [staff, responsibility] of [[hod, "HOD"], [officer, "DEPARTMENT_EXAM_OFFICER"], [general, "GENERAL_EXAM_OFFICER"]]) {
      await success(await call("/academic-work/appointments", admin, "POST", { staffId: staff.id, responsibility, departmentId: responsibility === "GENERAL_EXAM_OFFICER" ? null : department.id }));
    }
    application = await prisma.application.create({ data: { applicantId: student.id, fullName: student.name, email: student.email, phoneNumber: "08000000000", status: "ADMITTED", studentNumber: marker } });
    profile = await prisma.studentProfile.create({ data: { userId: student.id, applicationId: application.id } });
    enrolment = await prisma.studentEnrolment.create({ data: { studentId: profile.id, programmeId: programme.id, sessionId: session.id, levelId: level.id, status: "CONFIRMED", assignedBy: admin.id } });
    course = await success(await call("/academic-work/courses", hod, "POST", { departmentId: department.id, programmeId: programme.id, sessionId: session.id, levelId: level.id, semester: 1, code: "CHE101", title: "Community Health", creditUnits: 3, category: "CORE" }));
    await success(await call("/academic-work/courses/" + course.id, hod, "PATCH", { published: true }));
    const window = { programmeId: programme.id, sessionId: session.id, levelId: level.id, semester: 1, opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString(), minUnits: 3, maxUnits: 6 };
    assert.equal((await call("/academic-flow/windows", officer, "PUT", window)).status, 403);
    await success(await call("/academic-flow/windows", hod, "PUT", window));
    const submit = { enrolmentId: enrolment.id, semester: 1, courseIds: [course.id], version: null };
    assert.equal((await call("/academic-flow/student/registration", otherStudent, "POST", submit)).status, 403);
    let registration = await success(await call("/academic-flow/student/registration", student, "POST", submit));
    assert.equal((await call("/academic-flow/student/registration", student, "POST", submit)).status, 409);
    const review = { status: "APPROVED", note: "", version: registration.updatedAt };
    assert.equal((await call("/academic-flow/registrations/" + registration.id, stranger, "PATCH", review)).status, 404);
    registration = await success(await call("/academic-flow/registrations/" + registration.id, hod, "PATCH", review));
    const pdf = await call("/academic-flow/student/registrations/" + registration.id + "/pdf", student);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get("content-type"), /application\/pdf/);
    assert.equal((await call("/academic-flow/student/registrations/" + registration.id + "/pdf", otherStudent)).status, 404);
    const roster = await success(await call("/academic-flow/courses/" + course.id + "/results", hod));
    let batch = await success(await call("/academic-flow/courses/" + course.id + "/results", hod, "PUT", { version: null, scores: [{ registrationItemId: roster.students[0].id, score: 78.5 }] }));
    const change = async (actor, action, note = "") => success(await call("/academic-flow/results/" + batch.id + "/transition", actor, "POST", { action, note, version: batch.updatedAt }));
    assert.deepEqual(await success(await call("/academic-flow/student/results?enrolmentId=" + enrolment.id, student)), []);
    assert.equal((await call("/academic-flow/results/" + batch.id + "/transition", general, "POST", { action: "PUBLISH", note: "", version: batch.updatedAt })).status, 403);
    batch = await change(hod, "SUBMIT");
    assert.equal((await call("/academic-flow/results/" + batch.id + "/transition", hod, "POST", { action: "FORWARD", note: "", version: batch.updatedAt })).status, 403);
    batch = await change(officer, "RETURN", "Recheck the scores.");
    assert.equal(batch.status, "DRAFT");
    batch = await change(hod, "SUBMIT");
    batch = await change(officer, "FORWARD");
    assert.deepEqual(await success(await call("/academic-flow/student/results?enrolmentId=" + enrolment.id, student)), []);
    batch = await change(general, "PUBLISH");
    const published = await success(await call("/academic-flow/student/results?enrolmentId=" + enrolment.id, student));
    assert.equal(Number(published[0].score), 78.5);
    assert.equal((await call("/academic-flow/student/results?enrolmentId=" + enrolment.id, otherStudent)).status, 403);
    assert.equal((await call("/academic-flow/courses/" + course.id + "/results", hod, "PUT", { version: batch.updatedAt, scores: [{ registrationItemId: roster.students[0].id, score: 90 }] })).status, 409);
    let exam = await success(await call("/cbt/exams", hod, "POST", { courseId: course.id, title: "Community Health CBT", startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 7200000).toISOString(), durationMinutes: 30, questions: [{ prompt: "Choose B", options: ["A", "B"], correctIndex: 1 }] }));
    exam = await success(await call("/cbt/exams/" + exam.id, hod, "PATCH", { action: "PUBLISH", version: exam.updatedAt }));
    assert.equal((await call("/cbt/student/exams/" + exam.id + "/start", student, "POST", {})).status, 409);
    await prisma.cbtExam.update({ where: { id: exam.id }, data: { startsAt: new Date(Date.now() - 60000) } });
    const start = await success(await call("/cbt/student/exams/" + exam.id + "/start", student, "POST", {}));
    let attempt = await success(await call("/cbt/student/attempts/" + start.id, student));
    assert.equal("correctIndex" in attempt.questions[0], false);
    assert.equal((await call("/cbt/student/attempts/" + start.id, otherStudent)).status, 404);
    attempt = await success(await call("/cbt/student/attempts/" + start.id, student, "PUT", { answers: { 0: 1 }, submit: false, version: attempt.version }));
    attempt = await success(await call("/cbt/student/attempts/" + start.id, student, "PUT", { answers: { 0: 1 }, submit: true, version: attempt.version }));
    assert.ok(attempt.submittedAt);
    assert.equal(attempt.score, null);
    assert.equal((await prisma.cbtAttempt.findUnique({ where: { id: start.id } })).score.toString(), "100");
    exam = await prisma.cbtExam.update({ where: { id: exam.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await success(await call("/cbt/exams/" + exam.id, hod, "PATCH", { action: "RELEASE_RESULTS", version: exam.updatedAt.toISOString() }));
    assert.equal((await success(await call("/cbt/student/attempts/" + start.id, student))).score, 100);
    const resultCount = await prisma.courseResultEntry.count({ where: { batchId: batch.id } });
    assert.equal(resultCount, 1);
  } finally {
    if (course) {
      const exams = await prisma.cbtExam.findMany({ where: { courseId: course.id }, select: { id: true } });
      await prisma.cbtAttempt.deleteMany({ where: { examId: { in: exams.map(({ id }) => id) } } });
      await prisma.cbtExam.deleteMany({ where: { courseId: course.id } });
      const batches = await prisma.courseResultBatch.findMany({ where: { courseId: course.id }, select: { id: true } });
      await prisma.courseResultEntry.deleteMany({ where: { batchId: { in: batches.map(({ id }) => id) } } });
      await prisma.courseResultBatch.deleteMany({ where: { courseId: course.id } });
      await prisma.courseRegistrationItem.deleteMany({ where: { courseId: course.id } });
      await prisma.academicCourse.delete({ where: { id: course.id } });
    }
    if (enrolment) { await prisma.courseRegistration.deleteMany({ where: { enrolmentId: enrolment.id } }); await prisma.studentEnrolment.delete({ where: { id: enrolment.id } }); }
    if (profile) await prisma.studentProfile.delete({ where: { id: profile.id } });
    if (application) await prisma.application.delete({ where: { id: application.id } });
    if (programme) await prisma.courseRegistrationWindow.deleteMany({ where: { programmeId: programme.id } });
    if (department) await prisma.academicAppointment.deleteMany({ where: { departmentId: department.id } });
    await prisma.academicAppointment.deleteMany({ where: { staffId: { in: users.map(({ id }) => id) } } });
    if (programme) await prisma.academicProgramme.delete({ where: { id: programme.id } });
    if (department) await prisma.academicDepartment.delete({ where: { id: department.id } });
    if (session) await prisma.academicSession.delete({ where: { id: session.id } });
    if (level) await prisma.academicLevel.delete({ where: { id: level.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map(({ id }) => id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map(({ id }) => id) } } });
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
