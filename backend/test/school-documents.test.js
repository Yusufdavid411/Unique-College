import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { defaultDocumentsPolicy, documentsPolicySchema, feeVerified, screened, validateLetterPolicy, renderAdmissionMessage, screeningPolicy } from "../src/services/admissionDocuments.js";
import { schoolFormAllowed, validateSchoolForm } from "../src/services/schoolForms.js";
import { admissionLetterPdf, schoolFormPdf } from "../src/services/schoolDocumentsPdf.js";
import { releaseAdmissionLetter } from "../src/services/admissionLetters.js";

test("screening uses exact quoted NGN amount and matching payment mode", async () => {
  assert.deepEqual(await screeningPolicy({ siteSetting: { findUnique: async () => null } }), { amount: 2000 });
  const application = { isTest: true, payments: [{ type: "SCREENING_FEE", currency: "NGN", amount: "2000", status: "VERIFIED", isTest: true }] };
  assert.equal(feeVerified(application, "SCREENING_FEE", 2000), true);
  for (const override of [{ amount: 1999 }, { amount: 2001 }, { currency: "USD" }, { status: "PENDING" }, { isTest: false }]) assert.equal(feeVerified({ ...application, payments: [{ ...application.payments[0], ...override }] }, "SCREENING_FEE", 2000), false);
  assert.equal(feeVerified(application, "SCREENING_FEE", null), false);
  assert.equal(feeVerified({ payments: [] }, "SCREENING_FEE", 0), true);
  for (const status of ["NOT_SCHEDULED", "SCHEDULED", "FAILED"]) assert.equal(screened({ screeningStatus: status }), false);
  assert.equal(screened({ screeningStatus: "PASSED" }), true);
});

test("letter configuration rejects missing and stale dates without requiring an optional fee appendix", () => {
  assert.throws(() => validateLetterPolicy(defaultDocumentsPolicy));
  assert.equal(documentsPolicySchema.safeParse({ ...defaultDocumentsPolicy, resultDeadline: "2027-02-30" }).success, false);
  const policy = { ...defaultDocumentsPolicy, feeScheduleApproved: true, session: "2035/2036", duration: "Two years", effectiveDate: "2035-09-01", registrationOpen: "2035-08-01", registrationDeadline: "2035-09-30", resultDeadline: "2035-09-30", lecturesStart: "2035-09-01" };
  assert.doesNotThrow(() => validateLetterPolicy(policy, new Date("2035-06-01")));
  assert.doesNotThrow(() => validateLetterPolicy({ ...policy, feeScheduleApproved: false }, new Date("2035-06-01")));
  assert.doesNotThrow(() => validateLetterPolicy({ ...policy, session: "2035/2036 (temporary)" }, new Date("2035-06-01")));
  assert.doesNotThrow(() => validateLetterPolicy({ ...policy, duration: "2 years (temporary)" }, new Date("2035-06-01")));
  assert.throws(() => validateLetterPolicy(policy, new Date("2035-10-01")));
  assert.throws(() => validateLetterPolicy({ ...policy, registrationDeadline: "2035-07-01" }, new Date("2035-06-01")));
  assert.equal(renderAdmissionMessage("Exam {date}, {venue}: {instructions}", { date: "Friday", venue: "College", instructions: "Bring ID" }), "Exam Friday, College: Bring ID");
});

test("school forms enforce declaration, whitelisted fields and admission access", () => {
  const acceptance = { surname: "Applicant", firstName: "Sample", middleName: "", contactAddress: "Abuja", declaration: true };
  assert.doesNotThrow(() => validateSchoolForm("ACCEPTANCE", {}, false));
  assert.throws(() => validateSchoolForm("ACCEPTANCE", { ...acceptance, declaration: false }, true));
  assert.throws(() => validateSchoolForm("ACCEPTANCE", { ...acceptance, signature: "forged" }, true));
  assert.throws(() => validateSchoolForm("ACCEPTANCE", { ...acceptance, firstName: "" }, true));
  assert.throws(() => validateSchoolForm("ACCEPTANCE", { ...acceptance, programme: "Other programme" }, true));
  assert.deepEqual(validateSchoolForm("ACCEPTANCE", acceptance, true), acceptance);
  assert.equal(schoolFormAllowed({ status: "ACCEPTED", offerResponse: "ACCEPTED", acceptanceFeeAmount: 5000, payments: [] }, { role: "APPLICANT" }, "ACCEPTANCE"), false);
  assert.equal(schoolFormAllowed({ status: "ADMITTED" }, { role: "STUDENT" }, "STUDENT_RECORD"), true);
  assert.equal(schoolFormAllowed({ status: "ACCEPTED" }, { role: "APPLICANT" }, "GUARANTOR"), false);
});

test("original school templates generate complete PDFs without altering page counts", async () => {
  const application = { fullName: "Sample Applicant", firstName: "Sample", surname: "Applicant", applicationNumber: "UCHK-2035-ABCDEF", courseOfInterest: "Community Health", payments: [] };
  const snapshot = { ...defaultDocumentsPolicy, fullName: application.fullName, reference: "UCHST/REG/ADM/2035/UCHK-2035-ABCDEF", programme: application.courseOfInterest, session: "2035/2036", duration: "Two years", effectiveDate: "2035-09-01", registrationOpen: "2035-08-01", registrationDeadline: "2035-09-30", resultDeadline: "2035-09-30", lecturesStart: "2035-09-01", feeScheduleApproved: true };
  const letter = await PDFDocument.load(await admissionLetterPdf(application, { snapshot, issuedAt: new Date("2035-06-01") }));
  assert.equal(letter.getPageCount(), 2);
  const withoutAppendix = await PDFDocument.load(await admissionLetterPdf(application, { snapshot: { ...snapshot, feeScheduleApproved: false }, issuedAt: new Date("2035-06-01") }));
  assert.equal(withoutAppendix.getPageCount(), 1);
  const form = await PDFDocument.load(await schoolFormPdf(application, { kind: "ACCEPTANCE", data: { surname: "Updated", firstName: "Sample", middleName: "", contactAddress: "Abuja" }, submittedAt: new Date("2035-06-01") }, snapshot));
  assert.equal(form.getPageCount(), 1);
  await assert.rejects(() => schoolFormPdf(application, { kind: "ACCEPTANCE", data: { contactAddress: "Long address ".repeat(100) } }, snapshot), /fit|long|shorten/i);
});

test("letter release requires paid accepted offer and retains the issued snapshot on retry", async () => {
  const application = { id: "fixture", fullName: "Sample Applicant", applicationNumber: "UCHK-2035-ABCDEF", courseOfInterest: "Community Health", status: "ACCEPTED", screeningStatus: "PASSED", offerResponse: "ACCEPTED", acceptanceFeeAmount: 5000, payments: [] };
  let existing = null;
  const policy = { ...defaultDocumentsPolicy, feeScheduleApproved: true, session: "2035/2036", duration: "Two years", effectiveDate: "2035-09-01", registrationOpen: "2035-08-01", registrationDeadline: "2035-09-30", resultDeadline: "2035-09-30", lecturesStart: "2035-09-01" };
  const events = [];
  const transaction = {
    application: { findUnique: async () => application },
    siteSetting: { findUnique: async () => ({ value: JSON.stringify(policy) }) },
    admissionLetter: { findFirst: async () => existing, create: async ({ data }) => { existing = { ...data, id: "letter" }; return existing; } },
    applicationStatusHistory: { create: async ({ data }) => { events.push(data); return { id: "notice" }; } },
    auditLog: { create: async () => ({}) }
  };
  const database = { $transaction: async (callback) => callback(transaction) };
  await assert.rejects(() => releaseAdmissionLetter(database, application.id, { id: "admin", name: "Registrar" }), /verified acceptance fee/);
  application.payments.push({ type: "ACCEPTANCE_FEE", status: "VERIFIED", currency: "NGN", amount: 5000 });
  const first = await releaseAdmissionLetter(database, application.id, { id: "admin", name: "Registrar" });
  assert.equal(first.eventId, "notice");
  assert.equal(events.length, 1);
  application.courseOfInterest = "Changed after issuance";
  policy.session = "Different session";
  const repeated = await releaseAdmissionLetter(database, application.id, { id: "admin", name: "Registrar" });
  assert.equal(repeated.letter.snapshot.programme, "Community Health");
  assert.equal(repeated.eventId, null);
  assert.equal(events.length, 1);
});
