import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { readyForReview, canDownloadApplication } from "../src/services/applicationReview.js";

test("review and form downloads require confirmed payment and a submitted form", () => {
  const application = { status: "SUBMITTED", submittedAt: new Date(), formFeeAmount: 20000, payments: [{ type: "APPLICATION_FEE", status: "VERIFIED", currency: "NGN", amount: 20000 }] };
  assert.equal(readyForReview(application), true);
  assert.equal(canDownloadApplication(application), false);
  assert.equal(canDownloadApplication({ ...application, status: "ACCEPTED" }), true);
  assert.equal(canDownloadApplication({ ...application, status: "ADMITTED" }), true);
  for (const override of [{ submittedAt: null }, { payments: [] }, { status: "DRAFT" }, { status: "RETURNED" }]) {
    assert.equal(readyForReview({ ...application, ...override }), false);
    assert.equal(canDownloadApplication({ ...application, status: "ACCEPTED", ...override }), false);
  }
});

test("review API hides unsubmitted details and rejects premature decisions", async () => {
  const original = { user: prisma.user.findUnique, application: prisma.application.findUnique, list: prisma.application.findMany, transaction: prisma.$transaction };
  const application = { id: "11111111-1111-4111-8111-111111111111", fullName: "Test Applicant", email: "test@example.invalid", status: "DRAFT", formFeeAmount: 0, payments: [], educationRecords: [{ subject: "Private draft" }], documents: [], guardianName: "Private draft guardian" };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + jwt.sign({ sub: "admin", version: 0 }, env.jwtSecret) };
  const base = `http://127.0.0.1:${server.address().port}/api/applications/${application.id}`;
  try {
    prisma.user.findUnique = async () => ({ id: "admin", name: "Reviewer", role: "ADMIN", isActive: true, sessionVersion: 0 });
    prisma.application.findUnique = async () => structuredClone(application);
    const draft = await (await fetch(base, { headers })).json();
    assert.equal(draft.data.reviewReady, false);
    assert.equal(draft.data.educationRecords, undefined);
    assert.equal(draft.data.guardianName, undefined);
    async function decision(body) { return fetch(base + "/status", { method: "PATCH", headers, body: JSON.stringify(body) }); }
    assert.equal((await decision({ status: "REVIEWED" })).status, 409);
    Object.assign(application, { status: "SUBMITTED", submittedAt: new Date(), updatedAt: new Date(), statusHistory: [] });
    assert.equal((await decision({ status: "RETURNED", reviewNote: "" })).status, 422);
    application.status = "REVIEWED";
    assert.equal((await decision({ status: "ACCEPTED" })).status, 422);
    const history = [];
    prisma.$transaction = async (callback) => callback({
      application: {
        updateMany: async ({ data }) => { Object.assign(application, data); return { count: 1 }; },
        findUnique: async () => application
      },
      applicationStatusHistory: { create: async ({ data }) => { history.push(data); return {}; } },
      auditLog: { create: async () => ({}) }
    });
    const returned = await decision({ status: "RETURNED", reviewNote: "Correct your date of birth." });
    assert.equal(returned.status, 200);
    assert.equal(application.status, "RETURNED");
    assert.equal(history[0].emailStatus, "PENDING");
    assert.equal(history[0].emailRecipient, application.email);
    assert.equal((await returned.json()).data.application.reviewReady, false);
    Object.assign(application, {
      status: "REVIEWED", isTest: true, declarationAccepted: true, formFeeAmount: 20000,
      applicant: { id: "test-user", role: "APPLICANT" },
      payments: [{ type: "APPLICATION_FEE", status: "VERIFIED", currency: "NGN", amount: 20000, isTest: true }],
      documents: ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type, reviewStatus: "VERIFIED" }))
    });
    assert.equal((await decision({ status: "ACCEPTED" })).status, 200);
    assert.equal(canDownloadApplication(application), true);
    prisma.$transaction = async (callback) => callback({
      user: { update: async ({ data }) => { Object.assign(application.applicant, data); } },
      application: { updateMany: async ({ data }) => { Object.assign(application, data); return { count: 1 }; }, findUnique: async () => application },
      applicationStatusHistory: { create: async ({ data }) => { history.push(data); return {}; } },
      auditLog: { create: async () => ({}) }
    });
    const admitted = await decision({ status: "ADMITTED" });
    assert.equal(admitted.status, 200);
    const result = (await admitted.json()).data;
    assert.match(result.credentials.studentNumber, /^TEST\//);
    assert.match(result.credentials.portalUsername, /^TEST/);
    assert.equal(result.credentials.officialEmail, null);
    assert.equal(result.application.isTest, true);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.application.findUnique = original.application;
    prisma.application.findMany = original.list;
    prisma.$transaction = original.transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
