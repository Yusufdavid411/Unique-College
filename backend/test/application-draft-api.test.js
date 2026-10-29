import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

test("application drafts normalise empty dates and incomplete submissions return useful validation", async () => {
  const original = { user: prisma.user.findUnique, lookup: prisma.application.findUnique, update: prisma.application.update, transaction: prisma.$transaction };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api/applicant/application";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + jwt.sign({ sub: "draft-owner", version: 0 }, env.jwtSecret) };
  const application = { id: "draft", applicantId: "draft-owner", status: "DRAFT", formFeeAmount: 0, documents: [], payments: [] };
  let saved;
  try {
    prisma.user.findUnique = async () => ({ id: "draft-owner", name: "Test Applicant", role: "APPLICANT", isActive: true, sessionVersion: 0 });
    prisma.application.findUnique = async ({ where }) => {
      assert.equal(where.applicantId, "draft-owner");
      return structuredClone(application);
    };
    prisma.application.update = async ({ data }) => {
      assert.ok(data.dateOfBirth === undefined || data.dateOfBirth === null || data.dateOfBirth instanceof Date, "Prisma date fields cannot accept an empty string");
      saved = data;
      return { ...application, ...data };
    };
    async function patch(body) { return fetch(base, { method: "PATCH", headers, body: JSON.stringify(body) }); }
    assert.equal((await patch({ middleName: "", dateOfBirth: "", educationRecords: [], workExperience: [] })).status, 200);
    assert.equal(saved.middleName, "");
    assert.equal(saved.dateOfBirth, null);
    assert.equal((await patch({ dateOfBirth: "2004-03-15" })).status, 200);
    assert.equal(saved.dateOfBirth.toISOString(), "2004-03-15T00:00:00.000Z");
    assert.equal((await patch({ lga: "Test LGA" })).status, 200);
    assert.equal(Object.hasOwn(saved, "dateOfBirth"), false);
    assert.equal((await patch({ dateOfBirth: "invalid-date" })).status, 422);
    const incomplete = await fetch(base + "/submit", { method: "POST", headers });
    assert.equal(incomplete.status, 422);
    assert.ok((await incomplete.json()).data.missing.includes("Date of birth"));
    Object.assign(application, {
      surname: "Applicant", firstName: "Test", gender: "MALE", dateOfBirth: new Date("2004-03-15"),
      lga: "Test", state: "Test", nationality: "Nigerian", maritalStatus: "SINGLE",
      postalAddress: "Test address", permanentAddress: "Test address", guardianName: "Test guardian",
      guardianAddress: "Test address", guardianRelationship: "Parent", guardianPhone: "08000000000",
      courseOfInterest: "Test programme", declarationAccepted: true,
      educationRecords: ["English", "Mathematics", "Chemistry", "Physics", "Biology"].map((subject) => ({ subject, grade: "B3", examBody: "WAEC", year: "2024" })),
      documents: ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type }))
    });
    let history;
    prisma.$transaction = async (callback) => callback({
      application: { updateMany: async ({ data }) => { Object.assign(application, data); return { count: 1 }; }, findUnique: async () => application },
      applicationStatusHistory: { create: async ({ data }) => { history = data; } }
    });
    const complete = await fetch(base + "/submit", { method: "POST", headers });
    assert.equal(complete.status, 200);
    assert.equal((await complete.json()).data.status, "SUBMITTED");
    assert.equal(history.applicationId, "draft");
    assert.equal(history.fromStatus, "DRAFT");
    assert.equal(history.toStatus, "SUBMITTED");
    application.status = "SUBMITTED";
    assert.equal((await patch({ dateOfBirth: "" })).status, 409);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.application.findUnique = original.lookup;
    prisma.application.update = original.update;
    prisma.$transaction = original.transaction;
    await new Promise((resolve) => server.close(resolve));
  }
});
