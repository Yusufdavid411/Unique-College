import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { defaultDocumentsPolicy } from "../src/services/admissionDocuments.js";
import { flutterwaveService } from "../src/services/flutterwave.js";
import { statusEmailContent } from "../src/services/statusEmail.js";

test("PostgreSQL screening, automatic letter and completed-form downloads", { skip: !process.env.INTEGRATION_DATABASE_URL, timeout: 240000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /test/i);
  const marker = crypto.randomUUID();
  const ids = [];
  let application;
  const previous = await prisma.siteSetting.findUnique({ where: { key: "admissions_documents_policy" } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (path, method, body, user) => fetch(base + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ sub: user.id, version: 0 }, env.jwtSecret)}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const policy = { ...defaultDocumentsPolicy, feeScheduleApproved: true, session: "2035/2036", duration: "Two years", effectiveDate: "2035-09-01", registrationOpen: "2035-08-01", registrationDeadline: "2035-09-30", resultDeadline: "2035-09-30", lecturesStart: "2035-09-01" };
    await prisma.siteSetting.upsert({ where: { key: "admissions_documents_policy" }, create: { key: "admissions_documents_policy", value: JSON.stringify(policy), group: "admissions" }, update: { value: JSON.stringify(policy) } });
    const admin = await prisma.user.create({ data: { name: "Fixture registrar", email: `${marker}-admin@fixture.invalid`, passwordHash: "no-login", role: "ADMIN" } }); ids.push(admin.id);
    const applicant = await prisma.user.create({ data: { name: "Sample Applicant", email: `${marker}@fixture.invalid`, passwordHash: "no-login", role: "APPLICANT" } }); ids.push(applicant.id);
    application = await prisma.application.create({ data: { applicantId: applicant.id, fullName: "Sample Applicant", firstName: "Sample", surname: "Applicant", applicationNumber: `UCHK-${marker.slice(0, 8)}`, email: applicant.email, phoneNumber: "08000000000", courseOfInterest: "Community Health", status: "SUBMITTED", submittedAt: new Date(), declarationAccepted: true, formFeeAmount: 0, documents: { create: ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type, label: "Fixture only", path: "/uploads/applications/fixture.pdf", fileType: "application/pdf", fileSize: 100, reviewStatus: "VERIFIED" })) } } });
    const schedule = { ids: [application.id], date: new Date(Date.now() + 86400000).toISOString(), venue: "Fixture exam hall", message: "Please arrive early for check-in." };
    assert.equal((await call("/screening/schedule", "POST", schedule, admin)).status, 409);
    const outcome = { outcome: "PASSED", score: 75 };
    assert.equal((await call(`/screening/${application.id}/result`, "PATCH", outcome, admin)).status, 409);
    let reference;
    let amount;
    let providerId = 700000;
    const gateway = flutterwaveService(prisma, async (url, options) => {
      if (url.endsWith("/payments")) { const payload = JSON.parse(options.body); reference = payload.tx_ref; amount = Number(payload.amount); providerId++; return { ok: true, json: async () => ({ status: "success", data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/fixture" } }) }; }
      return { ok: true, json: async () => ({ status: "success", data: { id: providerId, tx_ref: reference, amount, currency: "NGN", status: "successful" } }) };
    }, { enabled: true, mode: "live", secretKey: "FLWSECK-fixture-not-a-real-key", webhookHash: "fixture-only", returnUrl: "http://localhost:5173/applicant/payments" });
    await assert.rejects(() => gateway.start(applicant.id, "SCREENING_FEE"), /eligible application/);
    assert.equal((await call(`/applications/${application.id}/status`, "PATCH", { status: "SCREENING_APPROVED" }, admin)).status, 200);
    const approval = await prisma.applicationStatusHistory.findFirst({ where: { applicationId: application.id, kind: "SCREENING_APPROVAL" } });
    assert.equal(approval.emailRecipient, applicant.email);
    assert.match(approval.notificationText, /accepted for screening/);
    assert.equal((await call("/screening/schedule", "POST", schedule, admin)).status, 409);
    const screening = await gateway.start(applicant.id, "SCREENING_FEE");
    assert.equal(amount, 2000);
    assert.equal((await gateway.verify(screening.reference, applicant.id)).status, "VERIFIED");
    await prisma.application.update({ where: { id: application.id }, data: { email: "form-contact@fixture.invalid" } });
    assert.equal((await call("/screening/schedule", "POST", schedule, admin)).status, 200);
    const invitation = await prisma.applicationStatusHistory.findFirst({ where: { applicationId: application.id, kind: "SCREENING_SCHEDULE" } });
    assert.equal(invitation.emailRecipient, applicant.email);
    assert.match(invitation.notificationText, /WAT/);
    assert.match(invitation.notificationText, /Fixture exam hall/);
    assert.match(invitation.notificationText, /Dear Sample Applicant/);
    assert.match(invitation.notificationText, /Please arrive early for check-in/);
    assert.match(invitation.notificationText, /Admissions Office/);
    assert.ok(statusEmailContent(invitation).text.includes(invitation.notificationText));
    await prisma.application.update({ where: { id: application.id }, data: { email: applicant.email } });
    assert.equal((await (await call("/screening/schedule", "POST", schedule, admin)).json()).data.scheduled, 0);
    await prisma.application.update({ where: { id: application.id }, data: { screeningAt: new Date(Date.now() - 60000) } });
    assert.equal((await call(`/screening/${application.id}/result`, "PATCH", outcome, admin)).status, 200);
    assert.equal((await call(`/applications/${application.id}/status`, "PATCH", { status: "ACCEPTED" }, admin)).status, 200);
    assert.equal((await call("/applicant/offer-response", "POST", { response: "ACCEPTED" }, applicant)).status, 200);
    const acceptance = await gateway.start(applicant.id, "ACCEPTANCE_FEE");
    assert.equal(amount, 5000);
    assert.equal((await gateway.verify(acceptance.reference, applicant.id)).letterStatus, "READY");
    assert.equal(await prisma.admissionLetter.count({ where: { applicationId: application.id } }), 1);
    assert.equal((await gateway.verify(acceptance.reference, applicant.id)).letterStatus, "READY");
    const form = { data: { contactAddress: "Fixture address Abuja", declaration: true }, submit: true, version: null };
    assert.equal((await call("/school-forms/ACCEPTANCE", "PUT", form, applicant)).status, 200);
    assert.equal((await call("/school-forms/ACCEPTANCE", "PUT", form, applicant)).status, 409);
    for (const actor of [admin, applicant]) for (const kind of ["LETTER", "ACCEPTANCE"]) {
      const response = await call(`/records/applications/${application.id}/documents/${kind}`, "GET", null, actor);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /application\/pdf/);
      assert.ok((await response.arrayBuffer()).byteLength > 1000);
    }
  } finally {
    try {
      if (application) {
        await prisma.schoolForm.deleteMany({ where: { applicationId: application.id } });
        await prisma.admissionLetter.deleteMany({ where: { applicationId: application.id } });
        await prisma.application.delete({ where: { id: application.id } });
      }
      await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, ...(application ? [{ targetId: application.id }] : [])] } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      if (previous) await prisma.siteSetting.update({ where: { key: previous.key }, data: { value: previous.value } });
      else await prisma.siteSetting.deleteMany({ where: { key: "admissions_documents_policy" } });
    } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await prisma.$disconnect(); }
  }
});
