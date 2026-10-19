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

export function canReviewTransition(from, to) {
  return from === to || Boolean(transitions[from]?.includes(to));
}

export function reviewStatusesFor(status) {
  return [status, ...(transitions[status] || [])];
}

export function hasVerifiedAdmissionDocuments(documents) {
  return requiredAdmissionDocuments.every((type) => documents.some((document) => document.type === type && document.reviewStatus === "VERIFIED"));
}
