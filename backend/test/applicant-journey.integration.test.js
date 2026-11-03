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

test("saved applicant resumes at the first incomplete stage and submits only after documents", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 240000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  let user;
  let application;
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
  } finally {
    try {
      if (application) await prisma.application.delete({ where: { id: application.id } });
      if (user) await prisma.user.delete({ where: { id: user.id } });
      for (const path of uploaded) { const local = resolveUploadPath(uploadRoot, path); if (local) await fs.unlink(local).catch(() => {}); }
    } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await prisma.$disconnect(); }
  }
});
