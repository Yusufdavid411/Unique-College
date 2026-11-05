import { formAccessFor } from "./formAccess.js";
import { admissionProgressFor, admissionFailure } from "./acceptance.js";
import { screeningProgress, screened } from "./admissionDocuments.js";
import { readyForReview } from "./applicationReview.js";
import { hasVerifiedAdmissionDocuments, requiredAdmissionDocuments } from "./admissionWorkflow.js";

export function applicationProgress(application, screeningAmount) {
  const submitted = Boolean(application.submittedAt);
  const ready = readyForReview(application);
  const formPaid = formAccessFor(application).unlocked;
  const screening = screeningProgress(application, screeningAmount);
  const admission = admissionProgressFor(application);
  const documentsReady = hasVerifiedAdmissionDocuments(application.documents || []);
  const verifiedDocumentCount = requiredAdmissionDocuments.filter((type) => (application.documents || []).some((document) => document.type === type && document.reviewStatus === "VERIFIED" && !document.supersededAt)).length;
  const acceptanceSubmitted = (application.schoolForms || []).some((form) => form.kind === "ACCEPTANCE" && form.status === "SUBMITTED");
  let queue = !ready ? "waiting" : "submitted";
  let label = formPaid ? "Payment confirmed · Awaiting submission" : "Awaiting application payment";
  if (ready) label = `${["PENDING", "REVIEWED"].includes(application.status) ? "Under review" : "Submitted"} · Documents ${verifiedDocumentCount}/${requiredAdmissionDocuments.length} verified`;
  if (application.screeningStatus === "APPROVED") { queue = "screening"; label = screening.paid ? "Screening paid · Awaiting schedule" : "Accepted for screening · Awaiting payment"; }
  if (application.screeningStatus === "SCHEDULED") { queue = "screening"; label = "Screening scheduled"; }
  if (screened(application)) { queue = "passed"; label = "Screening passed · Awaiting offer"; }
  if (application.screeningStatus === "FAILED") { queue = "failed"; label = "Screening unsuccessful"; }
  if (application.status === "ACCEPTED") {
    queue = "offered";
    label = admission.response === "DECLINED" ? "Offer declined" : admission.response !== "ACCEPTED" ? "Admission offered · Awaiting response" : !admission.paid ? "Offer accepted · Awaiting acceptance fee" : !acceptanceSubmitted && application.requiresAcceptanceForm ? "Acceptance paid · Awaiting acceptance form" : admission.clearanceStatus !== "CLEARED" ? "Acceptance complete · Awaiting clearance" : "Cleared · Ready for admission";
  }
  if (application.status === "RETURNED") { queue = "corrections"; label = "Corrections required"; }
  if (application.status === "REJECTED") { queue = "rejected"; label = "Rejected"; }
  if (application.status === "ADMITTED") { queue = "admitted"; label = "Admitted"; }
  let nextBatchAction = null;
  if (application.applicant?.isActive && application.applicant.role === "APPLICANT" && application.declarationAccepted && ready && documentsReady) {
    if (queue === "submitted" && ["SUBMITTED", "PENDING", "REVIEWED"].includes(application.status)) nextBatchAction = "SCREENING_APPROVED";
    if (queue === "passed" && ["SUBMITTED", "REVIEWED"].includes(application.status) && (application.screeningStatus === "EXEMPT" || screening.paid)) nextBatchAction = "ACCEPTED";
    if (queue === "offered" && !admissionFailure(application)) nextBatchAction = "ADMITTED";
  }
  return { queue, progressLabel: label, hasSubmitted: submitted, formPaymentConfirmed: formPaid, screeningPaid: screening.paid, acceptancePaid: admission.paid, acceptanceFormSubmitted: acceptanceSubmitted, documentsReady, verifiedDocumentCount, requiredDocumentCount: requiredAdmissionDocuments.length, nextBatchAction };
}
