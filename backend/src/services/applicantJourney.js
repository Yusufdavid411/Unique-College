import { formAccessFor } from "./formAccess.js";
import { requiredAdmissionDocuments } from "./admissionWorkflow.js";

const formFields = [["surname", "Surname"], ["firstName", "First name"], ["gender", "Sex"], ["dateOfBirth", "Date of birth"], ["lga", "LGA"], ["state", "State"], ["nationality", "Nationality"], ["maritalStatus", "Marital status"], ["postalAddress", "Postal address"], ["permanentAddress", "Permanent home address"], ["guardianName", "Parent or guardian name"], ["guardianAddress", "Parent or guardian address"], ["guardianRelationship", "Guardian relationship"], ["guardianPhone", "Parent or guardian phone"], ["courseOfInterest", "Course of interest"]];
const documentLabels = { PASSPORT: "Passport photograph", BIRTH_CERTIFICATE: "Birth certificate or declaration of age", NATIONAL_ID: "National identity card", EDUCATIONAL_RESULT: "Educational certificate or result" };
const present = (value) => value instanceof Date ? Number.isFinite(value.getTime()) : typeof value === "string" ? Boolean(value.trim()) : Boolean(value);

export function applicationFormMissing(application) {
  const missing = formFields.filter(([key]) => !present(application[key])).map(([, label]) => label);
  const results = Array.isArray(application.educationRecords) ? application.educationRecords.filter((record) => [record.subject, record.grade, record.examBody, record.year].every(present)) : [];
  if (results.length < 5) missing.push("At least five O-Level subject results");
  if (!application.declarationAccepted) missing.push("Applicant declaration");
  return missing;
}

export function applicationDocumentsMissing(application) {
  return requiredAdmissionDocuments.filter((type) => !(application.documents || []).some((document) => !document.supersededAt && document.type === type && document.reviewStatus !== "REJECTED")).map((type) => documentLabels[type]);
}

export function applicantJourney(application) {
  const paid = formAccessFor(application).unlocked;
  const formMissing = applicationFormMissing(application);
  const documentsMissing = applicationDocumentsMissing(application);
  const submitted = !["DRAFT", "RETURNED"].includes(application.status) && Boolean(application.submittedAt);
  const formComplete = formMissing.length === 0;
  const documentsComplete = documentsMissing.length === 0;
  const current = submitted ? "review" : !paid ? "payment" : !formComplete ? "application" : "documents";
  const path = { payment: "/applicant/payments", application: "/applicant/application", documents: "/applicant/documents", review: "/applicant" }[current];
  return { current, path, paid, formComplete, documentsComplete, submitted, canSubmit: paid && formComplete && documentsComplete && !submitted && ["DRAFT", "RETURNED"].includes(application.status), formMissing, documentsMissing,
    steps: [
      { id: "payment", title: "Payment", path: "/applicant/payments", complete: paid, locked: false },
      { id: "application", title: "Application form", path: "/applicant/application", complete: paid && (formComplete || submitted), locked: !paid },
      { id: "documents", title: "Documents", path: "/applicant/documents", complete: paid && documentsComplete, locked: !paid || (!formComplete && !submitted) },
      { id: "review", title: submitted && ["SUBMITTED", "PENDING", "REVIEWED"].includes(application.status) ? "Under review" : "Review", path: "/applicant", complete: ["ACCEPTED", "ADMITTED"].includes(application.status), locked: !submitted }
    ] };
}
