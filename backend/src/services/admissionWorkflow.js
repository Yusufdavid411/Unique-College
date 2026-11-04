const transitions = {
  DRAFT: ["RETURNED", "REJECTED"],
  RETURNED: ["REJECTED"],
  PENDING: ["REVIEWED", "SCREENING_APPROVED", "RETURNED", "REJECTED"],
  SUBMITTED: ["REVIEWED", "SCREENING_APPROVED", "RETURNED", "ACCEPTED", "REJECTED"],
  REVIEWED: ["SCREENING_APPROVED", "RETURNED", "ACCEPTED", "ADMITTED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["RETURNED", "REJECTED"],
  ACCEPTED: ["ADMITTED", "RETURNED", "REJECTED"],
  ADMITTED: [],
  REJECTED: ["RETURNED"]
};

export const requiredAdmissionDocuments = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"];

const statusMessages = {
  DRAFT: "Your application has not been submitted.",
  SUBMITTED: "Your application has been received and is awaiting review.",
  PENDING: "Your application is awaiting review.",
  REVIEWED: "Your application is under review. Check your portal for the next update.",
  RETURNED: "Review your saved form and any flagged documents, make the required corrections, then submit again from Documents.",
  INTERVIEW_SCHEDULED: "Check your applicant dashboard for your screening details.",
  SCREENING_APPROVED: "Your application has been accepted for screening. Pay the screening fee in your applicant portal. Admissions will schedule your exam after payment is verified.",
  ACCEPTED: "An admission offer is available. Open your dashboard to respond and see the next steps.",
  ADMITTED: "You have been admitted. Open your dashboard for student portal instructions."
};

export function applicationStatusMessage(status, rejectionReason) {
  return status === "REJECTED" ? rejectionReason?.trim() : statusMessages[status];
}

export function canReviewTransition(from, to) {
  return from === to || Boolean(transitions[from]?.includes(to));
}

export function reviewStatusesFor(status) {
  return [status, ...(transitions[status] || [])];
}

export function hasVerifiedAdmissionDocuments(documents) {
  return requiredAdmissionDocuments.every((type) => documents.some((document) => !document.supersededAt && document.type === type && document.reviewStatus === "VERIFIED"));
}
