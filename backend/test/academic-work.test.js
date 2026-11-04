import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("admin appointments scope HOD course writing and student catalogue access", async () => {
  const ids = Object.fromEntries(["admin", "hod", "other", "student", "department", "otherDepartment", "programme", "session", "level", "course", "appointment"].map((key) => [key, crypto.randomUUID()]));
  const department = { id: ids.department, name: "Health", isActive: true };
  const programme = { id: ids.programme, departmentId: ids.department, department, isActive: true };
  const actors = Object.fromEntries(["admin", "hod", "other", "student"].map((key) => [ids[key], { id: ids[key], name: key, role: key === "admin" ? "ADMIN" : key === "student" ? "STUDENT" : "STAFF", isActive: true, sessionVersion: 0 }]));
  let appointment = null;
  let course = null;
  const audits = [];
  const handlers = {
    user: { findUnique: async ({ where }) => actors[where.id] },
    academicAppointment: {
      findFirst: async ({ where }) => appointment && appointment.isActive && (!where.staffId || appointment.staffId === where.staffId) && appointment.departmentId === where.departmentId ? appointment : null,
      create: async ({ data }) => (appointment = { ...data, id: ids.appointment, isActive: true }),
      update: async ({ data }) => Object.assign(appointment, data)
    },
    academicDepartment: { findUnique: async ({ where }) => where.id === department.id ? department : null },
    academicProgramme: { findUnique: async () => programme },
    academicSession: { findUnique: async () => ({ id: ids.session, isActive: true }) },
    academicLevel: { findUnique: async () => ({ id: ids.level, isActive: true }) },
    academicCourse: {
      create: async ({ data }) => (course = { ...data, id: ids.course, published: false }),
      findUnique: async () => ({ ...course, department, programme, session: { isActive: true }, level: { isActive: true } }),
      update: async ({ data }) => Object.assign(course, data),
      findMany: async ({ where }) => {
        assert.equal(where.sessionId, ids.session);
        assert.equal(where.levelId, ids.level);
        return course && (!where.published || course.published) ? [course] : [];
      }
    },
    studentProfile: { findUnique: async () => ({ id: "profile", application: { status: "ADMITTED", applicantId: ids.student } }) },
    studentEnrolment: { findFirst: async ({ where }) => where.sessionId === ids.session && where.levelId === ids.level ? { programmeId: ids.programme, programme } : null },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } }
  };
  const restore = [];
  const transaction = prisma.$transaction;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    for (const [model, methods] of Object.entries(handlers)) for (const [method, handler] of Object.entries(methods)) {
      restore.push([model, method, prisma[model][method]]);
      prisma[model][method] = handler;
    }
    prisma.$transaction = async (run) => run(prisma);
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = (path, role, method = "GET", body) => fetch(base + path, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + jwt.sign({ sub: ids[role], version: 0 }, env.jwtSecret) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const appointmentData = { staffId: ids.hod, departmentId: ids.department, responsibility: "HOD" };
    assert.equal((await call("/academic-work/appointments", "other", "POST", appointmentData)).status, 403);
    assert.equal((await call("/academic-work/appointments", "admin", "POST", appointmentData)).status, 200);
    assert.equal((await call("/academic-work/appointments", "admin", "POST", appointmentData)).status, 409);
    const data = { departmentId: ids.department, programmeId: ids.programme, sessionId: ids.session, levelId: ids.level, semester: 1, code: "che101", title: "Community Health", creditUnits: 3, category: "CORE" };
    assert.equal((await call("/academic-work/courses", "other", "POST", data)).status, 403);
    assert.equal((await call("/academic-work/courses", "hod", "POST", { ...data, departmentId: ids.otherDepartment })).status, 403);
    assert.equal((await call("/academic-work/courses", "hod", "POST", { ...data, creditUnits: 0 })).status, 422);
    assert.equal((await call("/academic-work/courses", "hod", "POST", data)).status, 200);
    assert.equal(course.code, "CHE101");
    const studentPath = `/student/courses?sessionId=${ids.session}&levelId=${ids.level}`;
    assert.deepEqual((await (await call(studentPath, "student")).json()).data, []);
    assert.equal((await call(`/academic-work/courses/${ids.course}`, "hod", "PATCH", { published: true })).status, 200);
    assert.equal((await (await call(studentPath, "student")).json()).data.length, 1);
    assert.equal((await call(`/student/courses?sessionId=${crypto.randomUUID()}&levelId=${ids.level}`, "student")).status, 403);
    assert.equal((await call("/academic-work/appointments/" + ids.appointment, "admin", "DELETE")).status, 200);
    assert.equal((await call("/academic-work/courses", "hod", "POST", data)).status, 403);
    assert.ok(audits.some((event) => event.action === "academic.course_published"));
  } finally {
    for (const [model, method, original] of restore) prisma[model][method] = original;
    prisma.$transaction = transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
