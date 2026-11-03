import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { replaceApplicationDocument } from "../src/services/applicationDocuments.js";
import { applicationDocumentsMissing } from "../src/services/applicantJourney.js";
import { hasVerifiedAdmissionDocuments } from "../src/services/admissionWorkflow.js";

test("replacement supersedes the previous slot and resets verification without deleting history", async () => {
  const documents = [{ id: "old", type: "PASSPORT", applicationId: "application", path: "/uploads/documents/old.pdf", reviewStatus: "VERIFIED", reviewNote: "Old review", supersededAt: null }];
  const events = [];
  const application = { id: "application", status: "DRAFT", updatedAt: new Date() };
  let passport;
  const transaction = {
    application: { updateMany: async ({ data }) => { passport = data.passportPath; return { count: 1 }; } },
    applicationDocument: {
      updateMany: async ({ where, data }) => { assert.equal(where.supersededAt, null); const targets = documents.filter((document) => document.type === where.type && document.supersededAt === null); targets.forEach((document) => Object.assign(document, data)); return { count: targets.length }; },
      create: async ({ data }) => { const document = { ...data, id: "new", supersededAt: null }; documents.push(document); return document; }
    },
    auditLog: { create: async ({ data }) => { events.push(data); } }
  };
  const database = { $transaction: async (callback, options) => { assert.equal(options.isolationLevel, "Serializable"); return callback(transaction); } };
  const result = await replaceApplicationDocument(database, application, { type: "PASSPORT", label: "Passport", path: "/uploads/documents/new.pdf", fileType: "application/pdf", fileSize: 10 }, "owner");
  assert.equal(documents.length, 2);
  assert.equal(documents.filter((document) => !document.supersededAt).length, 1);
  assert.equal(result.reviewStatus, "PENDING");
  assert.equal(result.reviewNote, null);
  assert.equal(passport, result.path);
  assert.equal(events[0].action, "document.replaced:PASSPORT");
});

test("a stale replacement cannot change existing documents", async () => {
  const database = { $transaction: async (callback) => callback({ application: { updateMany: async () => ({ count: 0 }) }, applicationDocument: { updateMany: async () => assert.fail("Must not supersede on a stale application") } }) };
  await assert.rejects(() => replaceApplicationDocument(database, { id: "application", status: "DRAFT" }, { type: "PASSPORT" }, "owner"), /Refresh before replacing/);
});

test("old verified files cannot satisfy a current missing or rejected credential", () => {
  const documents = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type, reviewStatus: "VERIFIED" }));
  documents[0].supersededAt = new Date();
  documents.push({ type: "PASSPORT", reviewStatus: "REJECTED" });
  assert.ok(applicationDocumentsMissing({ documents }).includes("Passport photograph"));
  assert.equal(hasVerifiedAdmissionDocuments(documents), false);
});

test("document screen has one current file, clear upload labels and separate non-sticky page actions", async () => {
  const source = await readFile(new URL("../../frontend/src/pages/applicant/ApplicantDocuments.jsx", import.meta.url), "utf8");
  assert.match(source, /\.find\(\(record\) => record.type === type && !record.supersededAt\)/);
  assert.doesNotMatch(source, /Upload another file|uploaded\.map/);
  assert.match(source, /Replace file/);
  assert.match(source, /Awaiting review/);
  assert.match(source, /await refresh\(\{ background: true \}\)/);
  assert.match(source, /"Uploaded"/);
  assert.match(source, /<PrivateFilePreview path=\{document\.path\}/);
  const preview = await readFile(new URL("../../frontend/src/components/PrivateFilePreview.jsx", import.meta.url), "utf8");
  assert.match(preview, /api\.get\("\/files"/);
  assert.match(preview, /<img src=\{preview\.url\}/);
  assert.match(preview, /<iframe src=\{preview\.url/);
  assert.match(preview, /URL\.revokeObjectURL/);
  assert.doesNotMatch(preview, /\.download\s*=|\.click\(/);
  assert.match(source, /<\/details><\/section>}\s*\{\["DRAFT", "RETURNED"\].*className="document-page-actions"/);
  const migration = await readFile(new URL("../prisma/migrations/202611030014_current_application_documents/migration.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE UNIQUE INDEX/);
  assert.match(migration, /ROW_NUMBER/);
  assert.doesNotMatch(migration, /DELETE FROM|TRUNCATE/);
});
