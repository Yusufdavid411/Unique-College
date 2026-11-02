import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { admissionProgressFor } from "../services/acceptance.js";
import { hasVerifiedAdmissionDocuments } from "../services/admissionWorkflow.js";
import { readyForReview } from "../services/applicationReview.js";
import { attemptStatusEmail } from "../services/statusEmail.js";

const conflict = (message) => Object.assign(new Error(message), { statusCode: 409 });
const options = { isolationLevel: "Serializable", timeout: 15000 };

async function transaction(work) {
  try { return await prisma.$transaction(work, options); }
  catch (error) { if (error.code === "P2034") throw conflict("This record changed during your request. Refresh and try again."); throw error; }
}

async function saveEvent(database, application, user, kind, note) {
  const history = await database.applicationStatusHistory.create({ data: {
    applicationId: application.id, fromStatus: application.status, toStatus: application.status,
    kind, note, changedBy: user.name, emailStatus: "PENDING", emailRecipient: application.email
  } });
  await database.auditLog.create({ data: { actorId: user.id, action: `admission.${kind.toLowerCase()}`, targetType: "application", targetId: application.id } });
  return history.id;
}

export const respondToOffer = asyncHandler(async (req, res) => {
  const { response } = z.object({ response: z.enum(["ACCEPTED", "DECLINED"]) }).strict().parse(req.body);
  const result = await transaction(async (database) => {
    const application = await database.application.findUnique({ where: { applicantId: req.user.id }, include: { payments: true } });
    if (!application || application.status !== "ACCEPTED") throw conflict("There is no active admission offer to respond to.");
    if (application.offerResponse === response) return { admission: admissionProgressFor(application), historyId: null };
    if (application.offerResponse !== "PENDING") throw conflict("Your offer response is already recorded. Contact admissions if you need to change it.");
    if (application.acceptanceFeeAmount == null) throw conflict("Admissions is preparing your offer. Please check back shortly.");
    if (response === "DECLINED" && application.payments.some((payment) => payment.type === "ACCEPTANCE_FEE" && ["PENDING", "VERIFIED"].includes(payment.status))) throw conflict("An acceptance payment is already recorded. Contact admissions before changing your offer.");
    const changed = await database.application.updateMany({ where: { id: application.id, status: "ACCEPTED", offerResponse: "PENDING", updatedAt: application.updatedAt }, data: { offerResponse: response, offerRespondedAt: new Date() } });
    if (!changed.count) throw conflict("The offer changed. Refresh before responding.");
    const historyId = await saveEvent(database, application, req.user, "OFFER_RESPONSE", `Offer ${response.toLowerCase()} by applicant.`);
    return { admission: admissionProgressFor({ ...application, offerResponse: response }), historyId };
  });
  const email = await attemptStatusEmail(result.historyId);
  ok(res, { admission: result.admission, email }, "Offer response recorded.");
});

export const updateClearance = asyncHandler(async (req, res) => {
  const { status, note } = z.object({ status: z.enum(["PENDING", "CLEARED", "CORRECTIONS_REQUIRED"]), note: z.string().trim().max(2000).default("") }).strict()
    .refine((value) => value.status !== "CORRECTIONS_REQUIRED" || value.note.length >= 5, { path: ["note"], message: "Explain the required clearance corrections" }).parse(req.body);
  const result = await transaction(async (database) => {
    const application = await database.application.findUnique({ where: { id: req.params.id }, include: { payments: true, documents: true } });
    if (!application || application.status !== "ACCEPTED") throw conflict("Clearance is available only for an active admission offer.");
    const progress = admissionProgressFor(application);
    if (status === "CLEARED" && (progress.response !== "ACCEPTED" || !progress.paid || !readyForReview(application) || !application.declarationAccepted || !hasVerifiedAdmissionDocuments(application.documents))) throw conflict("Clearance requires an accepted offer, verified acceptance fee and all required documents verified.");
    if (application.clearanceStatus === status && (application.clearanceNote || "") === note) return { admission: progress, historyId: null };
    const data = { clearanceStatus: status, clearanceNote: note || null, clearedBy: status === "CLEARED" ? req.user.id : null, clearedAt: status === "CLEARED" ? new Date() : null };
    const changed = await database.application.updateMany({ where: { id: application.id, status: "ACCEPTED", updatedAt: application.updatedAt }, data });
    if (!changed.count) throw conflict("The application changed. Refresh before completing clearance.");
    const historyId = await saveEvent(database, application, req.user, "CLEARANCE", note || `Clearance ${status.toLowerCase().replaceAll("_", " ")}.`);
    return { admission: admissionProgressFor({ ...application, ...data }), historyId };
  });
  const email = await attemptStatusEmail(result.historyId);
  ok(res, { admission: result.admission, email }, "Clearance updated.");
});
