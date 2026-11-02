import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { studentProfileData } from "../src/services/studentRecords.js";

test("student foundation persists isolated profiles, secure transfers, assignments and published notices", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 300000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  const codeSuffix = marker.slice(0, 20);
  const actors = [];
  const applications = [];
  const academics = {};
  let announcement;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const issueToken = (user) => jwt.sign({ sub: user.id, version: user.sessionVersion }, env.jwtSecret);
  const call = (path, method = "GET", body, user, extraHeaders = {}) => fetch(base + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(user ? { Authorization: `Bearer ${issueToken(user)}` } : {}), ...extraHeaders }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const password = "StudentFoundation123";
  async function createUser(role, suffix) {
    const user = await prisma.user.create({ data: { email: `${marker}-${suffix}@student.invalid`, name: `Student fixture ${suffix}`, passwordHash: await bcrypt.hash(password, 4), role } });
    actors.push(user);
    return user;
  }
  async function createStudent(suffix) {
    const user = await createUser("STUDENT", suffix);
    const application = await prisma.application.create({ data: { applicantId: user.id, fullName: user.name, email: user.email, phoneNumber: "08000000000", status: "ADMITTED", studentNumber: `${marker}/${suffix}`, submittedAt: new Date(), admittedAt: new Date(), formFeeAmount: 0, acceptanceFeeAmount: 0, offerResponse: "ACCEPTED", clearanceStatus: "CLEARED", courseOfInterest: "Admission programme fixture" } });
    applications.push(application);
    const profile = await prisma.studentProfile.create({ data: studentProfileData(application) });
    return { user, application, profile };
  }
  try {
    const admin = await createUser("ADMIN", "admin");
    const owner = await createStudent("owner");
    const other = await createStudent("other");
    const applicant = await createUser("APPLICANT", "applicant");
    const staff = await createUser("STAFF", "staff");
    assert.equal((await call("/student/me")).status, 401);
    for (const user of [admin, staff, applicant]) assert.equal((await call("/student/me", "GET", null, user)).status, 403);
    assert.equal((await call("/auth/student/login", "POST", { identifier: applicant.email, password })).status, 403);
    const login = await call("/auth/student/login", "POST", { identifier: owner.user.email, password });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).data.user.role, "STUDENT");
    let response = await call("/student/me", "GET", null, owner.user);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    let record = (await response.json()).data;
    assert.equal(record.user.id, owner.user.id);
    assert.equal(record.user.passwordHash, undefined);
    assert.equal(record.application.studentNumber, owner.application.studentNumber);
    const profileUpdate = { version: record.updatedAt, phoneNumber: "08012345678", address: "Updated fixture address", guardianName: "Fixture Guardian", guardianRelationship: "Parent", guardianPhone: "08022222222", guardianAddress: "Fixture address" };
    assert.equal((await call("/student/profile", "PATCH", { ...profileUpdate, userId: other.user.id }, owner.user)).status, 422);
    assert.equal((await call("/student/profile", "PATCH", profileUpdate, owner.user)).status, 200);
    assert.equal((await prisma.studentProfile.findUnique({ where: { id: other.profile.id } })).phoneNumber, "08000000000");
    assert.equal((await call("/student/profile", "PATCH", profileUpdate, owner.user)).status, 409);
    assert.equal((await prisma.application.findUnique({ where: { id: owner.application.id } })).phoneNumber, "08000000000");

    const transfer = await call("/auth/student/handoff", "POST", {}, owner.user, { Origin: "http://localhost:5173" });
    assert.equal(transfer.status, 200);
    const cookie = transfer.headers.get("set-cookie").split(";")[0];
    assert.match(transfer.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(transfer.headers.get("set-cookie"), /SameSite=Strict/i);
    const url = new URL((await transfer.json()).data.url);
    assert.equal(url.origin, "http://localhost:5173");
    const code = new URLSearchParams(url.hash.slice(1)).get("code");
    const stored = await prisma.portalHandoff.findFirst({ where: { userId: owner.user.id } });
    assert.notEqual(stored.tokenHash, code);
    assert.equal((await call("/auth/student/handoff/redeem", "POST", { code })).status, 401);
    const exchange = await call("/auth/student/handoff/redeem", "POST", { code }, null, { Cookie: cookie });
    assert.equal(exchange.status, 200);
    assert.equal((await exchange.json()).data.user.id, owner.user.id);
    assert.equal((await call("/auth/student/handoff/redeem", "POST", { code }, null, { Cookie: cookie })).status, 401);
    const second = await call("/auth/student/handoff", "POST", {}, owner.user);
    const secondCode = new URLSearchParams(new URL((await second.json()).data.url).hash.slice(1)).get("code");
    await prisma.portalHandoff.updateMany({ where: { userId: owner.user.id, consumedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await call("/auth/student/handoff/redeem", "POST", { code: secondCode }, null, { Cookie: second.headers.get("set-cookie").split(";")[0] })).status, 401);

    assert.equal((await call("/academic/departments", "POST", { code: "NO", name: "Not authorised" }, owner.user)).status, 403);
    for (const [type, data] of [
      ["departments", { code: `D-${codeSuffix}`, name: "Fixture department" }],
      ["sessions", { name: `Fixture session ${marker}`, startsAt: "2026-01-01", endsAt: "2026-12-31" }],
      ["levels", { code: `L-${codeSuffix}`, name: "Fixture level" }]
    ]) {
      const created = await call(`/academic/${type}`, "POST", data, admin);
      assert.equal(created.status, 200);
      academics[type] = (await created.json()).data;
    }
    response = await call("/academic/programmes", "POST", { code: `P-${codeSuffix}`, name: "Fixture programme", departmentId: academics.departments.id }, admin);
    assert.equal(response.status, 200);
    academics.programmes = (await response.json()).data;
    const assignment = { programmeId: academics.programmes.id, sessionId: academics.sessions.id, levelId: academics.levels.id };
    assert.equal((await call(`/students/${owner.application.id}/enrolments`, "POST", assignment, staff)).status, 403);
    response = await call(`/students/${owner.application.id}/enrolments`, "POST", assignment, admin);
    assert.equal(response.status, 200);
    const enrolment = (await response.json()).data;
    assert.equal((await call(`/student/enrolments/${enrolment.id}/confirm`, "POST", { declaration: true, version: enrolment.updatedAt }, other.user)).status, 404);
    assert.equal((await call(`/student/enrolments/${enrolment.id}/confirm`, "POST", { declaration: true, version: "2000-01-01T00:00:00.000Z" }, owner.user)).status, 409);
    response = await call(`/student/enrolments/${enrolment.id}/confirm`, "POST", { declaration: true, version: enrolment.updatedAt }, owner.user);
    assert.equal(response.status, 200);
    record = (await response.json()).data;
    assert.equal(record.enrolments[0].status, "CONFIRMED");
    assert.equal((await call(`/student/enrolments/${enrolment.id}/confirm`, "POST", { declaration: true, version: enrolment.updatedAt }, owner.user)).status, 200);
    const anotherLevel = await prisma.academicLevel.create({ data: { code: `X-${codeSuffix}`, name: "Other fixture level" } });
    academics.extraLevel = anotherLevel;
    assert.equal((await call(`/students/${owner.application.id}/enrolments`, "POST", { ...assignment, levelId: anotherLevel.id }, admin)).status, 409);

    response = await call("/announcements", "POST", { title: "Fixture student notice", body: "Private fixture notice for student testing only.", isPublished: false }, admin);
    assert.equal(response.status, 200);
    announcement = (await response.json()).data;
    assert.equal((await call(`/student/announcements/${announcement.id}`, "GET", null, owner.user)).status, 404);
    assert.equal((await call(`/announcements/${announcement.id}`, "PATCH", { title: announcement.title, body: announcement.body, isPublished: true, version: announcement.updatedAt }, admin)).status, 200);
    response = await call(`/student/announcements/${announcement.id}`, "GET", null, owner.user);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.body, announcement.body);
    response = await call("/student/announcements", "GET", null, owner.user);
    assert.equal(response.status, 200);
    assert.ok((await response.json()).data.items.some((item) => item.id === announcement.id && !item.body));
    assert.equal((await call("/announcements", "POST", { title: "Unauthorised", body: "Unauthorised fixture", isPublished: true }, owner.user)).status, 403);
    assert.ok(await prisma.auditLog.count({ where: { actorId: owner.user.id, action: "student.profile_updated" } }));
  } finally {
    await prisma.portalHandoff.deleteMany({ where: { userId: { in: actors.map((user) => user.id) } } });
    const profiles = await prisma.studentProfile.findMany({ where: { userId: { in: actors.map((user) => user.id) } }, select: { id: true } });
    await prisma.studentEnrolment.deleteMany({ where: { studentId: { in: profiles.map((profile) => profile.id) } } });
    await prisma.studentProfile.deleteMany({ where: { id: { in: profiles.map((profile) => profile.id) } } });
    if (announcement) await prisma.studentAnnouncement.delete({ where: { id: announcement.id } });
    if (academics.programmes) await prisma.academicProgramme.delete({ where: { id: academics.programmes.id } });
    if (academics.departments) await prisma.academicDepartment.delete({ where: { id: academics.departments.id } });
    if (academics.sessions) await prisma.academicSession.delete({ where: { id: academics.sessions.id } });
    for (const level of [academics.levels, academics.extraLevel]) if (level) await prisma.academicLevel.delete({ where: { id: level.id } });
    await prisma.application.deleteMany({ where: { id: { in: applications.map((application) => application.id) } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: actors.map((user) => user.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: actors.map((user) => user.id) } } });
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
