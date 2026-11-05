import test from "node:test";
import assert from "node:assert/strict";
import { applicationProgress } from "../src/services/applicationProgress.js";
import { matchesApplicationQueue } from "../../frontend/src/api/applicationQueues.js";

const applicant = { isActive: true, role: "APPLICANT" };
const application = { status: "SUBMITTED", applicant, submittedAt: new Date(), declarationAccepted: true, formFeeAmount: 0, screeningFeeAmount: 2000, screeningStatus: "NOT_SCHEDULED", payments: [], documents: ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type, reviewStatus: "VERIFIED" })) };
const paid = (type, amount) => ({ type, amount, status: "VERIFIED", currency: "NGN", provider: "FLUTTERWAVE", isTest: false });

test("stage filters are independent of reminder audiences and retain all submitted records", () => {
  for (const record of [application, { ...application, status: "ACCEPTED" }, { ...application, status: "ADMITTED", applicant: { role: "STUDENT", isActive: true } }]) {
    const progress = applicationProgress(record, 2000);
    assert.equal(matchesApplicationQueue(progress, "submitted"), true);
    assert.equal(matchesApplicationQueue(progress, progress.queue), true);
  }
  assert.equal(matchesApplicationQueue(applicationProgress({ ...application, status: "DRAFT", submittedAt: null }, 2000), "submitted"), false);
  assert.equal(applicationProgress({ ...application, status: "RETURNED" }, 2000).queue, "corrections");
});

test("verified screening and acceptance payments immediately update milestones without issuing an offer", () => {
  const screening = { ...application, status: "REVIEWED", screeningStatus: "APPROVED" };
  assert.match(applicationProgress(screening, 2000).progressLabel, /Awaiting payment/);
  const confirmed = applicationProgress({ ...screening, payments: [paid("SCREENING_FEE", 2000)] }, 2000);
  assert.equal(confirmed.screeningPaid, true);
  assert.match(confirmed.progressLabel, /Screening paid/);
  assert.equal(confirmed.nextBatchAction, null);
  const offer = { ...application, status: "ACCEPTED", offerResponse: "ACCEPTED", acceptanceFeeAmount: 5000, requiresAcceptanceForm: true, payments: [paid("ACCEPTANCE_FEE", 5000)] };
  assert.match(applicationProgress(offer, 2000).progressLabel, /Awaiting acceptance form/);
  assert.match(applicationProgress({ ...offer, schoolForms: [{ kind: "ACCEPTANCE", status: "SUBMITTED" }] }, 2000).progressLabel, /Awaiting clearance/);
});

test("group advancement requires reviewed documents, correct payments and completed clearance", () => {
  assert.equal(applicationProgress(application, 2000).nextBatchAction, "SCREENING_APPROVED");
  assert.equal(applicationProgress({ ...application, documents: [] }, 2000).nextBatchAction, null);
  assert.equal(applicationProgress({ ...application, declarationAccepted: false }, 2000).nextBatchAction, null);
  assert.match(applicationProgress(application, 2000).progressLabel, /Documents 4\/4 verified/);
  assert.equal(applicationProgress({ ...application, documents: application.documents.slice(0, 2) }, 2000).verifiedDocumentCount, 2);
  const passed = { ...application, screeningStatus: "PASSED", payments: [paid("SCREENING_FEE", 2000)] };
  assert.equal(applicationProgress(passed, 2000).nextBatchAction, "ACCEPTED");
  assert.equal(applicationProgress({ ...passed, payments: [paid("SCREENING_FEE", 1999)] }, 2000).nextBatchAction, null);
  const offer = { ...passed, status: "ACCEPTED", offerResponse: "ACCEPTED", acceptanceFeeAmount: 5000, clearanceStatus: "CLEARED", requiresAcceptanceForm: true, schoolForms: [{ kind: "ACCEPTANCE", status: "SUBMITTED" }], payments: [...passed.payments, paid("ACCEPTANCE_FEE", 5000)] };
  assert.equal(applicationProgress(offer, 2000).nextBatchAction, "ADMITTED");
  assert.equal(applicationProgress({ ...offer, clearanceStatus: "PENDING" }, 2000).nextBatchAction, null);
});
