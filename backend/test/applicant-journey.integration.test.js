import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { uploadRoot } from "../src/config/uploads.js";
import { resolveUploadPath } from "../src/services/fileAccess.js";
import { replaceApplicationDocument } from "../src/services/applicationDocuments.js";

test("saved applicant resumes at the first incomplete stage and submits only after documents", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 240000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  let user;
  let application;
  let admin;
  const uploaded = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/applicant`;
  const call = (path, method = "GET", body) => fetch(base + path, { method, headers: { Authorization: `Bearer ${jwt.sign({ sub: user.id, version: 0 }, env.jwtSecret)}`, ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
  const progress = async () => {
    const response = await call("/dashboard");
    assert.equal(response.status, 200);
    return (await response.json()).data.journey;
  };
  try {
    user = await prisma.user.create({ data: { email: `${marker}@journey.invalid`, name: "Sample Applicant", role: "APPLICANT", passwordHash: "fixture-no-login" } });
    application = await prisma.application.create({ data: { applicantId: user.id, fullName: user.name, email: user.email, phoneNumber: "08000000000", formFeeAmount: 5000, status: "DRAFT" } });
    assert.equal((await progress()).current, "payment");
    assert.equal((await call("/application", "PATCH", { firstName: "Sample" })).status, 402);
    await prisma.payment.create({ data: { applicationId: application.id, type: "APPLICATION_FEE", amount: 5000, currency: "NGN", status: "VERIFIED", reference: `FIXTURE-${marker}` } });
    assert.equal((await progress()).current, "application");
    assert.equal((await call("/documents", "POST")).status, 409);
    const form = { surname: "Applicant", firstName: "Sample", middleName: "", gender: "MALE", dateOfBirth: "2005-01-01", lga: "Kwali", state: "FCT", nationality: "Nigerian", maritalStatus: "SINGLE", postalAddress: "Fixture address", permanentAddress: "Fixture address", guardianName: "Fixture Guardian", guardianAddress: "Fixture address", guardianRelationship: "Parent", guardianPhone: "08000000000", courseOfInterest: "Community Health", declarationAccepted: true, educationRecords: ["English", "Mathematics", "Biology", "Chemistry", "Physics"].map((subject) => ({ subject, grade: "B3", examBody: "WAEC", year: "2024" })) };
    assert.equal((await call("/application", "PATCH", form)).status, 200);
    assert.equal((await progress()).current, "documents");
    assert.equal((await prisma.application.findUnique({ where: { id: application.id } })).status, "DRAFT");
    assert.equal((await call("/application/submit", "POST")).status, 422);
    for (const type of ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"]) {
      const data = new FormData();
      data.set("type", type);
      data.set("label", "Fixture credential");
      data.set("file", new Blob(["%PDF-1.7\nFixture only"], { type: "application/pdf" }), "fixture.pdf");
      const response = await call("/documents", "POST", data);
      assert.equal(response.status, 201);
      uploaded.push((await response.json()).data.path);
    }
    assert.equal((await progress()).canSubmit, true);
    const oldPassport = await prisma.applicationDocument.findFirst({ where: { applicationId: application.id, type: "PASSPORT", supersededAt: null } });
    for (let replacement = 0; replacement < 2; replacement++) {
      const data = new FormData();
      data.set("type", "PASSPORT");
      data.set("label", "Replacement passport");
      data.set("file", new Blob(["%PDF-1.7\nReplacement fixture"], { type: "application/pdf" }), "replacement.pdf");
      const response = await call("/documents", "POST", data);
      assert.equal(response.status, 201);
      const document = (await response.json()).data;
      uploaded.push(document.path);
      assert.equal(document.reviewStatus, "PENDING");
      assert.equal(await prisma.applicationDocument.count({ where: { applicationId: application.id, type: "PASSPORT", supersededAt: null } }), 1);
      const dashboard = (await (await call("/dashboard")).json()).data;
      assert.equal(dashboard.application.documents.filter((record) => record.type === "PASSPORT").length, 1);
      assert.equal(dashboard.application.passportPath, document.path);
    }
    assert.ok((await prisma.applicationDocument.findUnique({ where: { id: oldPassport.id } })).supersededAt);
    assert.equal(await prisma.applicationDocument.count({ where: { applicationId: application.id, type: "PASSPORT" } }), 3);
    const oldFile = await fetch(`http://127.0.0.1:${server.address().port}/api/files?path=${encodeURIComponent(oldPassport.path)}`, { headers: { Authorization: `Bearer ${jwt.sign({ sub: user.id, version: 0 }, env.jwtSecret)}` } });
    assert.equal(oldFile.status, 404);
    await assert.rejects(() => prisma.applicationDocument.create({ data: { applicationId: application.id, type: "PASSPORT", label: "Duplicate rejected by constraint", path: "/uploads/documents/duplicate.pdf", fileType: "application/pdf", fileSize: 10 } }), (error) => error.code === "P2002");
    const beforeFailure = await prisma.application.findUnique({ where: { id: application.id } });
    const failingAudit = { $transaction: (callback, options) => prisma.$transaction((transaction) => callback({ ...transaction, auditLog: { create: async () => { throw new Error("Fixture audit failure"); } } }), options) };
    await assert.rejects(() => replaceApplicationDocument(failingAudit, beforeFailure, { type: "PASSPORT", label: "Must roll back", path: "/uploads/documents/rollback.pdf", fileType: "application/pdf", fileSize: 10 }, user.id), /Fixture audit failure/);
    assert.equal((await prisma.application.findUnique({ where: { id: application.id } })).passportPath, beforeFailure.passportPath);
    assert.equal(await prisma.applicationDocument.count({ where: { applicationId: application.id, type: "PASSPORT", supersededAt: null } }), 1);
    assert.equal(await prisma.applicationDocument.count({ where: { applicationId: application.id, type: "PASSPORT" } }), 3);
    assert.equal((await call("/application", "PATCH", { guardianPhone: "" })).status, 200);
    assert.equal((await progress()).current, "application");
    assert.equal((await call("/application/submit", "POST")).status, 422);
    assert.equal((await call("/application", "PATCH", { guardianPhone: "08000000000" })).status, 200);
    assert.equal((await call("/application/submit", "POST")).status, 200);
    const submitted = await progress();
    assert.equal(submitted.current, "review");
    assert.equal(submitted.submitted, true);
    assert.equal(submitted.canSubmit, false);
    assert.equal((await call("/application/submit", "POST")).status, 409);
    admin = await prisma.user.create({ data: { email: `${marker}@admin.invalid`, name: "Fixture admin", role: "ADMIN", passwordHash: "fixture-no-login" } });
    const removeAccount = (actor, confirmation) => fetch(`http://127.0.0.1:${server.address().port}/api/applications/${application.id}/account`, {
      method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ sub: actor.id, version: 0 }, env.jwtSecret)}` }, body: JSON.stringify({ confirmation })
    });
    assert.equal((await removeAccount(user, user.email)).status, 403);
    assert.equal((await removeAccount(admin, "wrong@example.invalid")).status, 422);
    assert.equal((await removeAccount(admin, user.email)).status, 200);
    assert.equal((await call("/dashboard")).status, 401);
    assert.equal(await prisma.user.findUnique({ where: { email: user.email } }), null);
    assert.equal((await prisma.application.findUnique({ where: { id: application.id } })).applicantId, null);
    assert.equal(await prisma.payment.count({ where: { applicationId: application.id } }), 1);
    assert.equal(await prisma.auditLog.count({ where: { actorId: admin.id, action: "applicant.account_deleted", targetId: application.id } }), 1);
  } finally {
    try {
      if (application) await prisma.application.delete({ where: { id: application.id } });
      if (user) await prisma.user.deleteMany({ where: { id: user.id } });
      if (admin) {
        await prisma.auditLog.deleteMany({ where: { actorId: admin.id } });
        await prisma.user.delete({ where: { id: admin.id } });
      }
      for (const path of uploaded) { const local = resolveUploadPath(uploadRoot, path); if (local) await fs.unlink(local).catch(() => {}); }
    } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await prisma.$disconnect(); }
  }
});
