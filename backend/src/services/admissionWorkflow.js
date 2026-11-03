const transitions = {
  DRAFT: ["RETURNED", "REJECTED"],
  RETURNED: ["REJECTED"],
  PENDING: ["REVIEWED", "RETURNED", "INTERVIEW_SCHEDULED", "REJECTED"],
  SUBMITTED: ["REVIEWED", "RETURNED", "INTERVIEW_SCHEDULED", "REJECTED"],
  REVIEWED: ["RETURNED", "INTERVIEW_SCHEDULED", "ACCEPTED", "ADMITTED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["REVIEWED", "RETURNED", "ACCEPTED", "ADMITTED", "REJECTED"],
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
