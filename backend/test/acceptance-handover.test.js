import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { admissionProgressFor, admissionFailure, acceptancePolicySchema } from "../src/services/acceptance.js";
import { flutterwaveService } from "../src/services/flutterwave.js";

test("acceptance requires an explicit quote, exact fee, correct purpose and matching payment mode", () => {
  const record = { status: "ACCEPTED", offerResponse: "ACCEPTED", acceptanceFeeAmount: 5000, clearanceStatus: "CLEARED", isTest: true, payments: [] };
  assert.equal(admissionProgressFor(record).canAdmit, false);
  assert.equal(admissionProgressFor({ ...record, acceptanceFeeAmount: null }).paid, false);
  assert.equal(admissionProgressFor({ ...record, acceptanceFeeAmount: 0 }).paid, true);
  const payment = { type: "ACCEPTANCE_FEE", amount: 5000, currency: "NGN", status: "VERIFIED", isTest: true };
  for (const change of [{ amount: 4999 }, { amount: 5001 }, { currency: "USD" }, { type: "APPLICATION_FEE" }, { status: "PENDING" }, { isTest: false }]) assert.equal(admissionProgressFor({ ...record, payments: [{ ...payment, ...change }] }).paid, false);
  assert.equal(admissionProgressFor({ ...record, payments: [payment] }).canAdmit, true);
  assert.match(admissionFailure({ ...record, payments: [payment] }), /Release the admission letter/);
  assert.equal(admissionFailure({ ...record, payments: [payment], admissionLetters: [{ id: "issued" }] }), null);
  for (const response of ["PENDING", "DECLINED"]) assert.match(admissionFailure({ ...record, offerResponse: response, payments: [payment] }), /accept the offer/);
  for (const amount of [-1, 5000.001, null, "5000", Infinity]) assert.equal(acceptancePolicySchema.safeParse({ amount }).success, false);
});

test("offer, editable future pricing, automatic acceptance payment, clearance and student activation share one identity", async () => {
  const owner = { id: "owner", name: "Fictional Applicant", email: "owner@example.invalid", passwordHash: await bcrypt.hash("ExistingApplicant123", 4), role: "APPLICANT", sessionVersion: 0, isActive: true, mustChangePassword: false };
  const originalHash = owner.passwordHash;
  let application = { id: crypto.randomUUID(), applicantId: owner.id, applicationNumber: "UCHK-HANDOVER-1234567", isTest: false, fullName: owner.name, email: owner.email, phoneNumber: "00000000000", status: "REVIEWED", screeningStatus: "PASSED", screeningFeeAmount: 2000, formFeeAmount: 5000, declarationAccepted: true, submittedAt: new Date(), updatedAt: new Date(), offerResponse: "PENDING", clearanceStatus: "PENDING" };
  let payments = ["APPLICATION_FEE", "SCREENING_FEE"].map((type) => ({ id: type, type, amount: type === "APPLICATION_FEE" ? 5000 : 2000, currency: "NGN", status: "VERIFIED", isTest: true, provider: "FLUTTERWAVE" }));
  let documents = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ id: crypto.randomUUID(), type, reviewStatus: "VERIFIED" }));
  let policy = { amount: 5000 };
  let histories = [];
  let audits = [];
  let providerAmount = 5000;
  const model = {
    studentProfile: {
      upsert: async ({ create }) => ({ id: "student-profile", ...create }),
      findUnique: async () => ({ application: { status: application.status, applicantId: owner.id } })
    },
    user: {
      findUnique: async ({ where }) => where.id === "admin" ? { id: "admin", name: "Registrar", role: "ADMIN", isActive: true, sessionVersion: 0 } : where.id === owner.id ? owner : { id: where.id, name: "Other applicant", role: "APPLICANT", isActive: true, sessionVersion: 0 },
      findFirst: async ({ where }) => where.OR.some((entry) => Object.entries(entry).some(([key, value]) => owner[key] === value)) ? owner : null,
      update: async ({ data }) => { const { sessionVersion, ...rest } = data; Object.assign(owner, rest); if (sessionVersion) owner.sessionVersion += sessionVersion.increment; return owner; }
    },
    application: {
      findUnique: async ({ where, include }) => {
        if ((where.id && where.id !== application.id) || (where.applicantId && where.applicantId !== owner.id)) return null;
        const applicant = include?.applicant?.select ? Object.fromEntries(Object.keys(include.applicant.select).map((key) => [key, owner[key]])) : owner;
        return structuredClone({ ...application, applicant, payments, documents, statusHistory: histories });
      },
      updateMany: async ({ where, data }) => {
        if ((where.status && where.status !== application.status) || (where.offerResponse && where.offerResponse !== application.offerResponse) || (where.updatedAt && +new Date(where.updatedAt) !== +new Date(application.updatedAt))) return { count: 0 };
        Object.assign(application, data, { updatedAt: new Date() }); return { count: 1 };
      },
      update: async ({ data }) => { Object.assign(application, data); return application; }
    },
    applicationDocument: {
      findFirst: async ({ where }) => documents.find((document) => document.id === where.id),
      update: async ({ where, data }) => { const document = documents.find((item) => item.id === where.id); Object.assign(document, data); return document; }
    },
    siteSetting: {
      findUnique: async ({ where }) => where.key === "acceptance_fee_policy" ? { value: JSON.stringify(policy) } : null,
      upsert: async ({ update }) => { policy = JSON.parse(update.value); return { id: "policy", value: update.value }; }
    },
    applicationStatusHistory: { create: async ({ data }) => { const row = { id: crypto.randomUUID(), ...data }; histories.push(row); return row; } },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
    payment: {
      create: async ({ data }) => { const payment = { id: crypto.randomUUID(), status: "PENDING", checkoutUrl: null, checkoutStartedAt: null, ...data }; payments.push(payment); return payment; },
      findFirst: async ({ where }) => { const payment = payments.find((item) => item.reference === where.reference && (!where.application || where.application.applicantId === owner.id)); return payment ? { ...payment, application: { applicantId: owner.id, isTest: false } } : null; },
      findUnique: async ({ where }) => payments.find((payment) => payment.id === where.id),
      updateMany: async ({ where, data }) => { const payment = payments.find((item) => item.id === where.id && item.status === where.status); if (!payment || (where.OR && payment.checkoutStartedAt)) return { count: 0 }; Object.assign(payment, data); return { count: 1 }; }
    }
  };
  model.$transaction = async (work) => {
    const previous = structuredClone({ application, owner, payments, documents, policy, histories, audits });
    try { return await work(model); }
    catch (error) { application = previous.application; Object.assign(owner, previous.owner); payments = previous.payments; documents = previous.documents; policy = previous.policy; histories = previous.histories; audits = previous.audits; throw error; }
  };
  const saved = [];
  for (const [name, methods] of Object.entries(model)) {
    if (name === "$transaction") { saved.push([prisma, name, prisma[name]]); prisma[name] = methods; }
    else for (const [method, handler] of Object.entries(methods)) { saved.push([prisma[name], method, prisma[name][method]]); prisma[name][method] = handler; }
  }
  const config = { enabled: true, mode: "test", secretKey: "FLWSECK_TEST-fixture-only", webhookHash: "fixture-only", deploymentEnvironment: "local", databaseName: "unique_college_test", testDatabaseName: "unique_college_test", returnUrl: "http://localhost:5173/applicant/payments" };
  const gateway = flutterwaveService(model, async (url, options) => {
    if (url.endsWith("/payments")) { assert.equal(JSON.parse(options.body).amount, "5000"); return { ok: true, json: async () => ({ status: "success", data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/fixture" } }) }; }
    return { ok: true, json: async () => ({ status: "success", data: { id: 456, tx_ref: payments.at(-1).reference, amount: providerAmount, currency: "NGN", status: "successful" } }) };
  }, config);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = (id, version = 0) => jwt.sign({ sub: id, version }, env.jwtSecret);
  const call = (path, method = "GET", body, credential = token("admin")) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(credential ? { Authorization: `Bearer ${credential}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const decision = (status) => call(`/applications/${application.id}/status`, "PATCH", { status });
  const clearance = (status, note = "") => call(`/applications/${application.id}/clearance`, "PATCH", { status, note });
  const flags = { PAYMENT_PROVIDER: "flutterwave", FLUTTERWAVE_MODE: "test", FLUTTERWAVE_RESTRICTED_PRODUCTION_TEST: "true" };
  const previousFlags = Object.fromEntries(Object.keys(flags).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, flags);
    assert.equal((await call("/settings/acceptance-fee", "GET", undefined, "")).status, 401);
    assert.equal((await call("/settings/acceptance-fee", "PUT", { amount: 1 }, token("owner"))).status, 403);
    assert.equal((await call("/applicant/offer-response", "POST", { response: "ACCEPTED" }, token("owner"))).status, 409);
    assert.equal((await decision("ADMITTED")).status, 409);
    assert.equal((await decision("ACCEPTED")).status, 200);
    assert.equal(application.acceptanceFeeAmount, 5000);
    assert.equal((await call("/settings/acceptance-fee", "PUT", { amount: 7500 })).status, 200);
    assert.equal(application.acceptanceFeeAmount, 5000);
    assert.equal((await call("/applicant/offer-response", "POST", { response: "ACCEPTED" }, token("other"))).status, 409);
    assert.equal((await call("/applicant/offer-response", "POST", { response: "ACCEPTED" }, token("owner"))).status, 200);
    const count = histories.length;
    assert.equal((await call("/applicant/offer-response", "POST", { response: "ACCEPTED" }, token("owner"))).status, 200);
    assert.equal(histories.length, count);
    assert.equal((await call("/applicant/offer-response", "POST", { response: "DECLINED" }, token("owner"))).status, 409);
    assert.equal((await clearance("CLEARED")).status, 409);
    assert.equal((await decision("ADMITTED")).status, 409);
    const checkout = await gateway.start("owner", "ACCEPTANCE_FEE");
    assert.equal((await gateway.start("owner", "ACCEPTANCE_FEE")).reference, checkout.reference);
    assert.equal(payments.length, 3);
    providerAmount = 4999;
    await assert.rejects(gateway.verify(checkout.reference, "owner"), /do not match/);
    assert.equal((await clearance("CLEARED")).status, 409);
    providerAmount = 5000;
    assert.equal((await gateway.verify(checkout.reference, "owner")).status, "VERIFIED");
    assert.equal(admissionProgressFor({ ...application, payments }).paid, true);
    await gateway.webhook({ event: "charge.completed", data: { id: 456 } });
    assert.equal(audits.filter((event) => event.action === "payment.flutterwave.verified").length, 1);
    assert.equal((await decision("REJECTED")).status, 409);
    assert.equal((await decision("ADMITTED")).status, 409);
    assert.equal((await clearance("CORRECTIONS_REQUIRED", "Bring the original result for inspection.")).status, 200);
    assert.equal((await clearance("CLEARED")).status, 200);
    assert.equal((await call(`/applications/${application.id}/documents/${documents[0].id}`, "PATCH", { reviewStatus: "REJECTED" })).status, 200);
    assert.equal(application.clearanceStatus, "PENDING");
    assert.equal((await clearance("CLEARED")).status, 409);
    assert.equal((await call(`/applications/${application.id}/documents/${documents[0].id}`, "PATCH", { reviewStatus: "VERIFIED" })).status, 200);
    assert.equal((await clearance("CLEARED")).status, 200);
    const blocked = await decision("ADMITTED");
    assert.equal(blocked.status, 409);
    assert.match((await blocked.json()).message, /Release the admission letter/);
    application.admissionLetters = [{ id: "issued" }];
    const admitted = await decision("ADMITTED");
    assert.equal(admitted.status, 200);
    const result = (await admitted.json()).data;
    assert.equal(result.credentials.temporaryPassword, undefined);
    assert.equal(result.application.applicant.passwordHash, undefined);
    assert.equal(owner.passwordHash, originalHash);
    assert.equal(owner.role, "STUDENT");
    assert.equal(owner.mustChangePassword, false);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, token("owner"))).status, 200);
    owner.mustChangePassword = true;
    const signIn = await call("/auth/applicant/login", "POST", { identifier: owner.email, password: "ExistingApplicant123" }, "");
    assert.equal(signIn.status, 200);
    const studentToken = (await signIn.json()).data.token;
    assert.equal((await call("/applicant/dashboard", "GET", undefined, studentToken)).status, 200);
    const portalLogin = await call("/auth/student/login", "POST", { identifier: owner.email, password: "ExistingApplicant123" }, "");
    assert.equal(portalLogin.status, 200);
    assert.equal((await portalLogin.json()).data.user.mustChangePassword, false);
    assert.equal((await call("/auth/password", "POST", { currentPassword: "ExistingApplicant123", password: "NewStudentPassword123" }, studentToken)).status, 200);
    assert.equal(owner.mustChangePassword, false);
    assert.equal((await call("/applicant/dashboard", "GET", undefined, studentToken)).status, 401);
    assert.equal((await call("/auth/applicant/login", "POST", { identifier: owner.email, password: "ExistingApplicant123" }, "")).status, 401);
    assert.equal((await call("/auth/applicant/login", "POST", { identifier: owner.email, password: "NewStudentPassword123" }, "")).status, 200);
    const repeated = await decision("ADMITTED");
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).data.credentials, null);
    assert.equal((await clearance("PENDING")).status, 409);
  } finally {
    for (const [key, value] of Object.entries(previousFlags)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    for (const [object, key, value] of saved.reverse()) object[key] = value;
    await new Promise((resolve) => server.close(resolve));
  }
});
