import test from "node:test";
import assert from "node:assert/strict";
import { verifyReviewedDocuments } from "../src/services/bulkDocumentReview.js";

test("batch verification requires current reviewed files and never grants admission", async () => {
  const updatedAt = new Date("2026-11-04T12:00:00Z");
  const application = { status: "SUBMITTED", submittedAt: updatedAt, formFeeAmount: 0, documents: [{ id: "file", updatedAt }] };
  const updates = [];
  const audits = [];
  const transaction = {
    application: { findUnique: async () => application },
    applicationDocument: { updateMany: async (query) => { updates.push(query); return { count: 1 }; } },
    auditLog: { create: async (query) => audits.push(query) }
  };
  const database = { $transaction: (run) => run(transaction) };
  await assert.rejects(() => verifyReviewedDocuments(database, "application", [], { id: "admin" }), /changed/);
  await assert.rejects(() => verifyReviewedDocuments(database, "application", [{ id: "old", updatedAt: updatedAt.toISOString() }], { id: "admin" }), /changed/);
  assert.equal(updates.length, 0);
  assert.deepEqual(await verifyReviewedDocuments(database, "application", [{ id: "file", updatedAt: updatedAt.toISOString() }], { id: "admin" }), { verified: 1 });
  assert.equal(updates[0].data.reviewStatus, "VERIFIED");
  assert.equal(audits[0].data.actorId, "admin");
  assert.equal(application.status, "SUBMITTED");
  application.status = "ADMITTED";
  await assert.rejects(() => verifyReviewedDocuments(database, "application", [{ id: "file", updatedAt: updatedAt.toISOString() }], { id: "admin" }), /awaiting admission/);
});
