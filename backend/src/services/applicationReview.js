import { formAccessFor } from "./formAccess.js";

export function readyForReview(application) {
  return Boolean(application.submittedAt) && !["DRAFT", "RETURNED"].includes(application.status) && formAccessFor(application).unlocked;
}

export function canDownloadApplication(application) {
  return readyForReview(application) && ["ACCEPTED", "ADMITTED"].includes(application.status);
}
