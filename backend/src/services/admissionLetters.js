import { documentsPolicy, validateLetterPolicy, screened } from "./admissionDocuments.js";
import { admissionProgressFor } from "./acceptance.js";
import { admissionLetterPdf } from "./schoolDocumentsPdf.js";

export async function releaseAdmissionLetterInTransaction(transaction, id, actor, duration) {
  const application = await transaction.application.findUnique({ where: { id }, include: { payments: true } });
  if (!application || !["ACCEPTED", "ADMITTED"].includes(application.status) || application.offerResponse !== "ACCEPTED" || !screened(application) || !admissionProgressFor(application).paid) throw Object.assign(new Error("An accepted admission offer and verified acceptance fee are required before releasing the letter."), { statusCode: 409 });
  const latest = await transaction.admissionLetter.findFirst({ where: { applicationId: id }, orderBy: { version: "desc" } });
  if (latest) return { letter: latest, eventId: null };
  const policy = { ...(await documentsPolicy(transaction)), ...(duration ? { duration } : {}) };
  const issuedAt = new Date();
  validateLetterPolicy(policy, issuedAt);
  if (!application.courseOfInterest?.trim()) throw Object.assign(new Error("The admission programme must be confirmed before issuing the letter."), { statusCode: 422 });
  const snapshot = { ...policy, fullName: application.fullName, programme: application.courseOfInterest, reference: `UCHST/REG/ADM/${issuedAt.getUTCFullYear()}/${application.applicationNumber || application.id}` };
  const created = await transaction.admissionLetter.create({ data: { applicationId: id, version: 1, snapshot, issuedAt, issuedBy: actor.id } });
  await admissionLetterPdf(application, created);
  const event = await transaction.applicationStatusHistory.create({ data: { applicationId: id, kind: "LETTER_READY", fromStatus: application.status, toStatus: application.status, changedBy: actor.name, notificationSubject: "Admission letter available", notificationText: "Your admission letter is ready. Sign in to download your official copy and complete your acceptance form.", emailRecipient: application.email, emailStatus: "PENDING" } });
  await transaction.auditLog.create({ data: { actorId: actor.id, action: "admission_letter.issued", targetType: "application", targetId: id } });
  return { letter: created, eventId: event.id };
}

export async function releaseAdmissionLetter(database, id, actor, duration) {
  return database.$transaction((transaction) => releaseAdmissionLetterInTransaction(transaction, id, actor, duration), { isolationLevel: "Serializable", timeout: 20000 });
}
