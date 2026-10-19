import test from "node:test";
import assert from "node:assert/strict";
import { canReviewTransition, hasVerifiedAdmissionDocuments, requiredAdmissionDocuments } from "../src/services/admissionWorkflow.js";

test("admission decisions require review and cannot silently reverse admission", () => {
  assert.equal(canReviewTransition("DRAFT", "ADMITTED"), false);
  assert.equal(canReviewTransition("SUBMITTED", "REVIEWED"), true);
  assert.equal(canReviewTransition("REVIEWED", "ADMITTED"), true);
  assert.equal(canReviewTransition("ADMITTED", "REJECTED"), false);
  assert.equal(canReviewTransition("REJECTED", "RETURNED"), true);
});

test("admission requires all required document types to be verified", () => {
  const documents = requiredAdmissionDocuments.map((type) => ({ type, reviewStatus: "VERIFIED" }));
  assert.equal(hasVerifiedAdmissionDocuments(documents), true);
  assert.equal(hasVerifiedAdmissionDocuments(documents.slice(1)), false);
  assert.equal(hasVerifiedAdmissionDocuments(documents.map((document) => ({ ...document, reviewStatus: "PENDING" }))), false);
});
