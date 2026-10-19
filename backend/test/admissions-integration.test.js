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

test("applicant purchase, closure and admission approval enforce the full account lifecycle", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 300000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  const email = marker + "@admissions.invalid";
  let staff;
  let applicant;
  let application;
  let proofPath;
  const proofPaths = [];
  const previousPolicy = await prisma.siteSetting.findUnique({ where: { key: "admissions_policy" } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api";
  const policy = { open: true, message: "Test admissions open", applicationFee: 5000, paymentInstructions: "Test school account instructions for isolated verification only." };
  async function call(route, method = "GET", body, token) {
    return fetch(base + route, { method, headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  }
  try {
    staff = await prisma.user.create({ data: { name: "Test administrator", email: "admin-" + email, passwordHash: "test-only", role: "ADMIN" } });
    const adminToken = jwt.sign({ sub: staff.id, version: 0 }, env.jwtSecret);
    assert.equal((await call("/settings/admissions", "PUT", policy, adminToken)).status, 200);
    const registration = await call("/applicant/register", "POST", { fullName: "Test Applicant", email, phoneNumber: "08000000000", password: "IsolatedTestPassword123" });
    assert.equal(registration.status, 201);
    const session = (await registration.json()).data;
    applicant = session.user;
    let dashboard = (await (await call("/applicant/dashboard", "GET", undefined, session.token)).json()).data;
    application = dashboard.application;
    assert.equal(dashboard.formAccess.unlocked, false);
    assert.equal((await call("/applicant/application", "PATCH", { firstName: "Test" }, session.token)).status, 402);
    assert.equal((await call("/applications", "POST", {})).status, 410);
    assert.equal((await call("/settings/admissions", "PUT", { ...policy, applicationFee: 7000 }, adminToken)).status, 200);
    const payment = new FormData();
    payment.set("type", "APPLICATION_FEE"); payment.set("amount", "5000"); payment.set("reference", marker);
    payment.set("proof", new Blob(["%PDF-1.7\nTest evidence"], { type: "application/pdf" }), "proof.pdf");
    const evidence = await call("/applicant/payments", "POST", payment, session.token);
    assert.equal(evidence.status, 201);
    let recorded = (await evidence.json()).data;
    proofPath = recorded.proofPath;
    proofPaths.push(proofPath);
    assert.equal((await call("/applicant/payments", "POST", undefined, session.token)).status, 409);
    assert.equal((await call("/applicant/payments/" + recorded.id, "DELETE", undefined, adminToken)).status, 403);
    assert.equal((await call("/applicant/payments/" + recorded.id, "DELETE", undefined, session.token)).status, 200);
    assert.equal((await prisma.payment.findUnique({ where: { id: recorded.id } })).status, "CANCELLED");
    assert.equal((await call("/applications/" + application.id + "/payments/" + recorded.id, "PATCH", { status: "VERIFIED" }, adminToken)).status, 409);
    const replacement = await call("/applicant/payments", "POST", payment, session.token);
    assert.equal(replacement.status, 201);
    recorded = (await replacement.json()).data;
    proofPaths.push(recorded.proofPath);
    assert.equal((await call("/applications/" + application.id + "/payments/" + recorded.id, "PATCH", { status: "REJECTED" }, adminToken)).status, 200);
    const retry = await call("/applicant/payments", "POST", payment, session.token);
    assert.equal(retry.status, 201);
    recorded = (await retry.json()).data;
    proofPaths.push(recorded.proofPath);
    dashboard = (await (await call("/applicant/dashboard", "GET", undefined, session.token)).json()).data;
    assert.equal(dashboard.formAccess.unlocked, false);
    const review = await call("/applications/" + application.id + "/payments/" + recorded.id, "PATCH", { status: "VERIFIED" }, adminToken);
    assert.equal(review.status, 200);
    assert.equal((await call("/applicant/payments/" + recorded.id, "DELETE", undefined, session.token)).status, 409);
    assert.equal((await call("/applicant/payments", "POST", payment, session.token)).status, 409);
    dashboard = (await (await call("/applicant/dashboard", "GET", undefined, session.token)).json()).data;
    assert.equal(dashboard.formAccess.unlocked, true);
    assert.equal(Number(dashboard.formAccess.amount), 5000);
    assert.equal((await call("/applicant/application", "PATCH", { firstName: "Test", surname: "Applicant" }, session.token)).status, 200);
    assert.equal((await call("/settings/admissions", "PUT", { ...policy, open: false }, adminToken)).status, 200);
    assert.equal((await call("/applicant/register", "POST", { fullName: "Second Applicant", email: "other-" + email, phoneNumber: "08000000000", password: "IsolatedTestPassword123" })).status, 409);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, session.token)).status, 200);
    assert.equal((await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken)).status, 409);
    await prisma.application.update({ where: { id: application.id }, data: { status: "REVIEWED", declarationAccepted: true } });
    assert.equal((await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken)).status, 422);
    await prisma.applicationDocument.createMany({ data: ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ applicationId: application.id, type, label: "Isolated test document", path: proofPath, fileType: "application/pdf", fileSize: 20, reviewStatus: "VERIFIED" })) });
    const decision = await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken);
    assert.equal(decision.status, 200);
    const admitted = (await decision.json()).data;
    assert.ok(admitted.credentials.temporaryPassword);
    assert.equal(admitted.application.applicant.role, "STUDENT");
    assert.equal(admitted.application.applicant.passwordHash, undefined);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, session.token)).status, 401);
    const studentLogin = await call("/auth/applicant/login", "POST", { identifier: admitted.credentials.portalUsername, password: admitted.credentials.temporaryPassword });
    assert.equal(studentLogin.status, 200);
    assert.equal((await studentLogin.json()).data.user.mustChangePassword, true);
    const repeated = await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken);
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).data.credentials, null);
  } finally {
    if (application) await prisma.application.delete({ where: { id: application.id } });
    if (applicant) {
      await prisma.auditLog.deleteMany({ where: { actorId: applicant.id } });
      await prisma.user.delete({ where: { id: applicant.id } });
    }
    if (staff) {
      await prisma.auditLog.deleteMany({ where: { actorId: staff.id } });
      await prisma.user.delete({ where: { id: staff.id } });
    }
    if (previousPolicy) await prisma.siteSetting.update({ where: { key: "admissions_policy" }, data: { value: previousPolicy.value, group: previousPolicy.group } });
    else await prisma.siteSetting.deleteMany({ where: { key: "admissions_policy" } });
    for (const path of proofPaths) { const local = resolveUploadPath(uploadRoot, path); if (local) await fs.unlink(local).catch(() => {}); }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
