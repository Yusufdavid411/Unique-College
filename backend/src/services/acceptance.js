import { z } from "zod";
import { feeVerified } from "./paymentEligibility.js";

export const acceptancePolicyKey = "acceptance_fee_policy";
export const acceptancePolicySchema = z.object({ amount: z.number().finite().min(0).max(10000000).multipleOf(0.01) }).strict();

export async function acceptancePolicy(database) {
  const setting = await database.siteSetting.findUnique({ where: { key: acceptancePolicyKey } });
  return setting ? acceptancePolicySchema.parse(JSON.parse(setting.value)) : { amount: 5000 };
}

export function admissionProgressFor(application) {
  const amount = application.acceptanceFeeAmount;
  const offered = ["ACCEPTED", "ADMITTED"].includes(application.status);
  const paid = feeVerified(application, "ACCEPTANCE_FEE", amount);
  const response = application.offerResponse || "PENDING";
  const clearanceStatus = application.clearanceStatus || "PENDING";
  return { offered, response, amount: amount == null ? null : String(amount), currency: "NGN", paid, clearanceStatus, clearanceNote: application.clearanceNote || null,
    canPay: application.status === "ACCEPTED" && response === "ACCEPTED" && amount != null && !paid,
    canAdmit: application.status === "ACCEPTED" && response === "ACCEPTED" && paid && clearanceStatus === "CLEARED" };
}

export function admissionFailure(application) {
  const progress = admissionProgressFor(application);
  if (application.status !== "ACCEPTED") return "Issue an admission offer before final admission.";
  if (progress.response !== "ACCEPTED") return "The applicant must accept the offer before final admission.";
  if (!progress.paid) return "The quoted acceptance fee must be verified before final admission.";
  if (progress.clearanceStatus !== "CLEARED") return "Complete admissions clearance before final admission.";
  if (application.requiresAcceptanceForm && !(application.schoolForms || []).some((form) => form.kind === "ACCEPTANCE" && form.status === "SUBMITTED")) return "Submit the acceptance form before final admission.";
  if (!application.admissionLetters?.length) return "Release the admission letter before confirming final admission.";
  return null;
}
