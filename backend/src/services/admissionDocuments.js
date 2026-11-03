import { z } from "zod";
import { Prisma } from "@prisma/client";
import { readyForReview } from "./applicationReview.js";

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
export function feeVerified(application, type, amount) {
  return amount != null && (new Prisma.Decimal(amount).equals(0) || application.payments.some((payment) => payment.type === type && payment.status === "VERIFIED" && payment.currency === "NGN" && Boolean(payment.isTest) === Boolean(application.isTest) && new Prisma.Decimal(payment.amount).equals(amount)));
}
export function screeningProgress(application, defaultAmount) {
  const status = application.screeningStatus || "NOT_SCHEDULED";
  const eligible = readyForReview(application) && ["SUBMITTED", "PENDING", "REVIEWED", "INTERVIEW_SCHEDULED"].includes(application.status) && ["NOT_SCHEDULED", "SCHEDULED"].includes(status);
  const amount = application.screeningFeeAmount ?? defaultAmount;
  const simulation = process.env.PAYMENT_PROVIDER === "flutterwave" && process.env.FLUTTERWAVE_MODE === "test" && process.env.FLUTTERWAVE_RESTRICTED_PRODUCTION_TEST === "true";
  const paid = feeVerified(application, "SCREENING_FEE", amount) || (simulation && !application.isTest && feeVerified({ ...application, isTest: true, payments: (application.payments || []).filter((payment) => payment.provider === "FLUTTERWAVE") }, "SCREENING_FEE", amount));
  return { status, eligible, amount: amount == null ? null : String(amount), paid, date: application.screeningAt || null, venue: application.screeningVenue || null, instructions: application.screeningInstructions || null };
}
export function screened(application) { return ["PASSED", "EXEMPT"].includes(application.screeningStatus); }
export function renderAdmissionMessage(template, values) {
  return template.replace(/\{(date|venue|instructions|programme)\}/g, (_, key) => values[key] || "");
}
export function validateLetterPolicy(policy, issuedAt = new Date()) {
  if (!policy.feeScheduleApproved) throw Object.assign(new Error("The registrar must review and approve the original fee-schedule appendix and its bank instructions before issuing letters."), { statusCode: 422 });
  const fields = ["session", "duration", "effectiveDate", "registrationOpen", "registrationDeadline", "resultDeadline", "lecturesStart"];
  if (fields.some((key) => !policy[key])) throw Object.assign(new Error("Complete the session, duration and all letter dates in Admissions document settings before issuing a letter."), { statusCode: 422 });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(issuedAt);
  if (policy.registrationDeadline < today || policy.registrationDeadline < policy.registrationOpen || policy.resultDeadline < today || policy.lecturesStart < policy.effectiveDate) throw Object.assign(new Error("Check the admission-letter dates. Deadlines cannot be stale, and date ranges must be in order."), { statusCode: 422 });
}
