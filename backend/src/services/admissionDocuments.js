import { z } from "zod";
import { readyForReview } from "./applicationReview.js";
import { feeVerified } from "./paymentEligibility.js";
export { feeVerified } from "./paymentEligibility.js";

export const documentsPolicyKey = "admissions_documents_policy";
export const screeningPolicyKey = "screening_policy";
const dateField = z.string().max(10).refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime()) && new Date(value).toISOString().slice(0, 10) === value, "Use a valid date");
export const documentsPolicySchema = z.object({
  feeScheduleApproved: z.boolean().default(false),
  session: z.string().trim().max(50), duration: z.string().trim().max(80), effectiveDate: dateField,
  registrationOpen: dateField, registrationDeadline: dateField, resultDeadline: dateField, lecturesStart: dateField,
  screeningMessage: z.string().trim().min(10).max(1500), passedMessage: z.string().trim().min(10).max(1500), failedMessage: z.string().trim().min(10).max(1500), offerMessage: z.string().trim().min(10).max(1500)
}).strict();
export const defaultDocumentsPolicy = { feeScheduleApproved: false, session: "", duration: "", effectiveDate: "", registrationOpen: "", registrationDeadline: "", resultDeadline: "", lecturesStart: "",
  screeningMessage: "Congratulations! You are scheduled for the entrance examination and screening. Please arrive early so you have time to check in before the exam starts.",
  passedMessage: "You have passed the entrance examination/screening. The admissions office will confirm your admission decision in your portal.",
  failedMessage: "Your entrance examination/screening result is available. Please sign in and contact admissions if you need guidance.",
  offerMessage: "An admission offer is ready for {programme}. Sign in to accept the offer and pay your quoted acceptance fee. Your admission letter becomes available after payment verification and the registrar's release."
};
export async function documentsPolicy(database) {
  const row = await database.siteSetting.findUnique({ where: { key: documentsPolicyKey } });
  return row ? documentsPolicySchema.parse(JSON.parse(row.value)) : defaultDocumentsPolicy;
}
export async function screeningPolicy(database) {
  const row = await database.siteSetting.findUnique({ where: { key: screeningPolicyKey } });
  return row ? z.object({ amount: z.number().finite().min(0).max(10000000).multipleOf(0.01) }).strict().parse(JSON.parse(row.value)) : { amount: 2000 };
}
export function screeningProgress(application, defaultAmount) {
  const status = application.screeningStatus || "NOT_SCHEDULED";
  const eligible = readyForReview(application) && ((application.status === "REVIEWED" && status === "APPROVED") || (application.status === "INTERVIEW_SCHEDULED" && status === "SCHEDULED"));
  const amount = application.screeningFeeAmount ?? defaultAmount;
  const paid = feeVerified(application, "SCREENING_FEE", amount);
  return { status, eligible, amount: amount == null ? null : String(amount), paid, date: application.screeningAt || null, venue: application.screeningVenue || null, instructions: application.screeningInstructions || null };
}
export function screened(application) { return ["PASSED", "EXEMPT"].includes(application.screeningStatus); }
export function renderAdmissionMessage(template, values) {
  return template.replace(/\{(date|venue|instructions|programme)\}/g, (_, key) => values[key] || "");
}
export function validateLetterPolicy(policy, issuedAt = new Date()) {
  const fields = ["session", "duration", "effectiveDate", "registrationOpen", "registrationDeadline", "resultDeadline", "lecturesStart"];
  if (fields.some((key) => !policy[key])) throw Object.assign(new Error("Complete the session, duration and all letter dates in Admissions document settings before issuing a letter."), { statusCode: 422 });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(issuedAt);
  if (policy.registrationDeadline < today || policy.registrationDeadline < policy.registrationOpen || policy.resultDeadline < today || policy.lecturesStart < policy.effectiveDate) throw Object.assign(new Error("Check the admission-letter dates. Deadlines cannot be stale, and date ranges must be in order."), { statusCode: 422 });
}
