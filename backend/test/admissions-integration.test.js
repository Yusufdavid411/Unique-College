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
import { flutterwaveService } from "../src/services/flutterwave.js";

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
  const previousAcceptance = await prisma.siteSetting.findUnique({ where: { key: "acceptance_fee_policy" } });
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
    payment.set("amount", "5000");
    payment.set("proof", new Blob(["%PDF-1.7\nTest evidence"], { type: "application/pdf" }), "proof.pdf");
    const evidence = await call("/applicant/payments", "POST", payment, session.token);
    assert.equal(evidence.status, 201);
    let recorded = (await evidence.json()).data;
    assert.equal(recorded.type, "APPLICATION_FEE");
    assert.match(recorded.reference, /^FORM-/);
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
    assert.equal((await call("/applicant/application", "PATCH", { firstName: "Test", surname: "Applicant", dateOfBirth: "" }, session.token)).status, 200);
    assert.equal((await call("/settings/admissions", "PUT", { ...policy, open: false }, adminToken)).status, 200);
    assert.equal((await call("/applicant/register", "POST", { fullName: "Second Applicant", email: "other-" + email, phoneNumber: "08000000000", password: "IsolatedTestPassword123" })).status, 409);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, session.token)).status, 200);
    assert.equal((await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken)).status, 409);
    await prisma.application.update({ where: { id: application.id }, data: { status: "REVIEWED", declarationAccepted: true, submittedAt: new Date() } });
    assert.equal((await call("/applications/" + application.id + "/status", "PATCH", { status: "ACCEPTED" }, adminToken)).status, 422);
    await prisma.applicationDocument.createMany({ data: ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ applicationId: application.id, type, label: "Isolated test document", path: proofPath, fileType: "application/pdf", fileSize: 20, reviewStatus: "VERIFIED" })) });
    assert.equal((await call("/settings/acceptance-fee", "PUT", { amount: 5000 }, adminToken)).status, 200);
    assert.equal((await call("/applications/" + application.id + "/status", "PATCH", { status: "ACCEPTED" }, adminToken)).status, 200);
    assert.equal((await call("/settings/acceptance-fee", "PUT", { amount: 7500 }, adminToken)).status, 200);
    assert.equal((await prisma.application.findUnique({ where: { id: application.id } })).acceptanceFeeAmount.toString(), "5000");
    assert.equal((await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken)).status, 409);
    assert.equal((await call("/applicant/offer-response", "POST", { response: "ACCEPTED" }, session.token)).status, 200);
    const providerId = String(Date.now());
    let reference;
    const gateway = flutterwaveService(prisma, async (url, options) => {
      if (url.endsWith("/payments")) { const payload = JSON.parse(options.body); reference = payload.tx_ref; assert.equal(payload.amount, "5000"); return { ok: true, json: async () => ({ status: "success", data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/integration-fixture" } }) }; }
      return { ok: true, json: async () => ({ status: "success", data: { id: providerId, tx_ref: reference, amount: 5000, currency: "NGN", status: "successful" } }) };
    }, { enabled: true, mode: "live", secretKey: "FLWSECK-integration-fixture-not-a-real-key", webhookHash: "fixture-only", returnUrl: "http://localhost:5173/applicant/payments" });
    const checkout = await gateway.start(applicant.id, "ACCEPTANCE_FEE");
    assert.equal((await gateway.verify(checkout.reference, applicant.id)).status, "VERIFIED");
    await gateway.webhook({ event: "charge.completed", data: { id: providerId } });
    assert.equal(await prisma.payment.count({ where: { applicationId: application.id, type: "ACCEPTANCE_FEE", status: "VERIFIED" } }), 1);
    const oldBirthCertificate = await prisma.applicationDocument.findFirst({ where: { applicationId: application.id, type: "BIRTH_CERTIFICATE" } });
    assert.equal((await call(`/applications/${application.id}/documents/${oldBirthCertificate.id}`, "PATCH", { reviewStatus: "REJECTED" }, adminToken)).status, 200);
    assert.equal((await call(`/applications/${application.id}/clearance`, "PATCH", { status: "CORRECTIONS_REQUIRED", note: "Upload the correct birth certificate." }, adminToken)).status, 200);
    const correction = new FormData();
    correction.set("type", "BIRTH_CERTIFICATE");
    correction.set("label", "Corrected birth certificate");
    correction.set("file", new Blob(["%PDF-1.7\nCorrected fixture"], { type: "application/pdf" }), "correction.pdf");
    const corrected = await call("/applicant/documents", "POST", correction, session.token);
    assert.equal(corrected.status, 201);
    const correctedDocument = (await corrected.json()).data;
    proofPaths.push(correctedDocument.path);
    assert.equal((await call(`/applications/${application.id}/clearance`, "PATCH", { status: "CLEARED" }, adminToken)).status, 409);
    assert.equal((await call(`/applications/${application.id}/documents/${correctedDocument.id}`, "PATCH", { reviewStatus: "VERIFIED" }, adminToken)).status, 200);
    assert.equal((await call("/applications/" + application.id + "/clearance", "PATCH", { status: "CLEARED", note: "Original documents checked." }, adminToken)).status, 200);
    const acceptance = await prisma.payment.findFirst({ where: { reference: checkout.reference } });
    for (const credential of [session.token, adminToken]) {
      const receipt = await call(`/records/applications/${application.id}/payments/${acceptance.id}/receipt`, "GET", undefined, credential);
      assert.equal(receipt.status, 200);
      assert.match(receipt.headers.get("content-type"), /application\/pdf/);
      assert.ok((await receipt.arrayBuffer()).byteLength > 1000);
      const form = await call(`/records/applications/${application.id}/form`, "GET", undefined, credential);
      assert.equal(form.status, 200);
      assert.match(form.headers.get("content-type"), /application\/pdf/);
    }
    const beforeAdmission = await prisma.user.findUnique({ where: { id: applicant.id } });
    const decision = await call("/applications/" + application.id + "/status", "PATCH", { status: "ADMITTED" }, adminToken);
    assert.equal(decision.status, 200);
    const admitted = (await decision.json()).data;
    assert.equal(admitted.credentials.temporaryPassword, undefined);
    assert.equal((await prisma.user.findUnique({ where: { id: applicant.id } })).passwordHash, beforeAdmission.passwordHash);
    assert.equal(admitted.application.applicant.role, "STUDENT");
    assert.equal(admitted.application.applicant.passwordHash, undefined);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, session.token)).status, 401);
    const studentLogin = await call("/auth/applicant/login", "POST", { identifier: admitted.credentials.portalUsername, password: "IsolatedTestPassword123" });
    assert.equal(studentLogin.status, 200);
    const studentSession = (await studentLogin.json()).data;
    assert.equal(studentSession.user.mustChangePassword, true);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, studentSession.token)).status, 403);
    assert.equal((await call("/auth/password", "POST", { currentPassword: "IsolatedTestPassword123", password: "ActivatedStudentPassword456" }, studentSession.token)).status, 200);
    const activated = (await (await call("/auth/applicant/login", "POST", { identifier: applicant.email, password: "ActivatedStudentPassword456" })).json()).data;
    assert.equal(activated.user.mustChangePassword, false);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, activated.token)).status, 200);
    const students = await call("/students", "GET", undefined, adminToken);
    assert.equal(students.status, 200);
    assert.ok((await students.json()).data.students.some((student) => student.id === application.id));
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
    if (previousAcceptance) await prisma.siteSetting.update({ where: { key: "acceptance_fee_policy" }, data: { value: previousAcceptance.value, group: previousAcceptance.group } });
    else await prisma.siteSetting.deleteMany({ where: { key: "acceptance_fee_policy" } });
    for (const path of proofPaths) { const local = resolveUploadPath(uploadRoot, path); if (local) await fs.unlink(local).catch(() => {}); }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
