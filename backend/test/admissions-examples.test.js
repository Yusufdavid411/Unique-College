import test from "node:test";
import assert from "node:assert/strict";
import { exampleSubmissionDeadline, fillLetterExamples } from "../../frontend/src/data/admissionsExamples.js";
import { defaultDocumentsPolicy, documentsPolicySchema, validateLetterPolicy } from "../src/services/admissionDocuments.js";

test("suggested deadline is 30 days from the current WAT date", () => {
  assert.equal(exampleSubmissionDeadline(new Date("2026-11-03T23:30:00Z")), "2026-12-04");
});

test("letter defaults fill blanks without overwriting existing details or approving the optional appendix", () => {
  const policy = { ...defaultDocumentsPolicy, registrationOpen: "2026-12-12" };
  const result = fillLetterExamples(policy, new Date("2026-11-04T12:00:00Z"));
  assert.equal(result.registrationOpen, policy.registrationOpen);
  assert.equal(result.screeningMessage, policy.screeningMessage);
  assert.equal(result.feeScheduleApproved, false);
  assert.ok(documentsPolicySchema.safeParse(result).success);
  assert.doesNotThrow(() => validateLetterPolicy(result, new Date("2026-11-04T12:00:00Z")));
  assert.equal(result.session, "2026/2027");
  assert.equal(result.duration, "2 years");
});
