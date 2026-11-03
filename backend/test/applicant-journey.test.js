import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applicantJourney, applicationFormMissing, applicationDocumentsMissing } from "../src/services/applicantJourney.js";

function completeForm() {
  return { status: "DRAFT", formFeeAmount: 5000, payments: [{ type: "APPLICATION_FEE", amount: 5000, currency: "NGN", status: "VERIFIED" }], surname: "Applicant", firstName: "Sample", gender: "MALE", dateOfBirth: new Date("2005-01-01"), lga: "Kwali", state: "FCT", nationality: "Nigerian", maritalStatus: "SINGLE", postalAddress: "Sample address", permanentAddress: "Sample address", guardianName: "Sample Guardian", guardianAddress: "Sample address", guardianRelationship: "Parent", guardianPhone: "08000000000", courseOfInterest: "Community Health", declarationAccepted: true, educationRecords: ["English", "Mathematics", "Biology", "Chemistry", "Physics"].map((subject) => ({ subject, grade: "B3", examBody: "WAEC", year: "2024" })), documents: [] };
}

test("resume follows confirmed payment, complete form, documents and review in order", () => {
  const application = completeForm();
  let progress = applicantJourney({ ...application, payments: [] });
  assert.equal(progress.current, "payment");
  assert.equal(progress.path, "/applicant/payments");
  assert.equal(progress.steps.find((step) => step.id === "application").locked, true);
  progress = applicantJourney({ ...application, guardianPhone: "" });
  assert.equal(progress.current, "application");
  assert.equal(progress.steps.find((step) => step.id === "documents").locked, true);
  assert.equal(progress.canSubmit, false);
  progress = applicantJourney(application);
  assert.equal(progress.current, "documents");
  assert.equal(progress.formComplete, true);
  assert.equal(progress.canSubmit, false);
  application.documents = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type, reviewStatus: "PENDING" }));
  progress = applicantJourney(application);
  assert.equal(progress.path, "/applicant/documents");
  assert.equal(progress.canSubmit, true);
  assert.equal(progress.steps.find((step) => step.id === "application").locked, false);
  progress = applicantJourney({ ...application, status: "SUBMITTED", submittedAt: new Date() });
  assert.equal(progress.current, "review");
  assert.equal(progress.submitted, true);
  assert.equal(progress.canSubmit, false);
});

test("blank fields, incomplete results and rejected credentials never mark a stage complete", () => {
  const application = completeForm();
  assert.deepEqual(applicationFormMissing(application), []);
  assert.ok(applicationFormMissing({ ...application, surname: "   " }).includes("Surname"));
  assert.ok(applicationFormMissing({ ...application, educationRecords: application.educationRecords.map((record) => ({ ...record, grade: "" })) }).includes("At least five O-Level subject results"));
  assert.ok(applicationFormMissing({ ...application, declarationAccepted: false }).includes("Applicant declaration"));
  assert.equal(applicationFormMissing({ ...application, middleName: "" }).length, 0);
  const documents = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].map((type) => ({ type, reviewStatus: "VERIFIED" }));
  assert.deepEqual(applicationDocumentsMissing({ ...application, documents }), []);
  documents[2].reviewStatus = "REJECTED";
  const returned = applicantJourney({ ...application, status: "RETURNED", submittedAt: new Date(), documents });
  assert.equal(returned.current, "documents");
  assert.equal(returned.canSubmit, false);
  assert.deepEqual(returned.documentsMissing, ["National identity card"]);
  documents.push({ type: "NATIONAL_ID", reviewStatus: "PENDING" });
  assert.equal(applicantJourney({ ...application, status: "RETURNED", documents }).canSubmit, true);
});

test("final submission lives on Documents while form saves and continues without submitting", async () => {
  const root = new URL("../../frontend/src/", import.meta.url);
  const form = await readFile(new URL("pages/applicant/ApplicantApplicationForm.jsx", root), "utf8");
  assert.doesNotMatch(form, /api\.post\("\/applicant\/application\/submit"/);
  assert.match(form, /Next: Documents/);
  assert.match(form, /noValidate onSubmit=\{continueToDocuments\}/);
  assert.match(form, /className="document-page-actions"/);
  assert.match(form, /api\.patch\("\/applicant\/application", form\)[\s\S]*saved\.journey\.formComplete/);
  assert.doesNotMatch(form, /onClick=\{save\}|reportValidity\(/);
  assert.match(form, /saved\.journey\.formComplete/);
  const documents = await readFile(new URL("pages/applicant/ApplicantDocuments.jsx", root), "utf8");
  assert.match(documents, /api\.post\("\/applicant\/application\/submit"/);
  assert.match(documents, /!journey\.canSubmit/);
  assert.match(documents, /Previous: Application form/);
  const dashboard = await readFile(new URL("pages/applicant/ApplicantDashboard.jsx", root), "utf8");
  assert.match(dashboard, /portalPath\(journey.path\)/);
  assert.match(dashboard, /Complete registration/);
  const navigation = await readFile(new URL("components/ApplicantLayout.jsx", root), "utf8");
  assert.doesNotMatch(navigation, /Applicant steps/);
});
