import { Prisma } from "@prisma/client";
import { getAdmissionsPolicy } from "./admissionsPolicy.js";
import { readyForReview } from "./applicationReview.js";

export const bulkLimit = 500;
export const bulkAudiences = {
  waiting: ["Complete your application", "Please sign in, complete your form and submit your supporting documents before the deadline."],
  submitted: ["Application received", "We have received your application. Check your portal for the review outcome or any requests from Admissions."],
  corrections: ["Application corrections required", "Please sign in to review the requested corrections and resubmit your application."],
  screening: ["Screening update", "Please check your portal for your screening payment status or examination schedule."],
  passed: ["Screening complete", "You have completed the screening stage. Please check your portal for the admissions decision."],
  offered: ["Admission offer update", "Please sign in to review your provisional offer and any remaining acceptance steps."],
  failed: ["Screening result available", "Your screening was unsuccessful. Sign in to review the result and contact Admissions if you need guidance."],
  rejected: ["Application decision available", "Your application was not successful. Please sign in to review the decision and any instructions from Admissions."]
};

export function notificationAudience(application) {
  const { status, submittedAt, screeningStatus, offerResponse } = application;
  if (status === "ADMITTED" || application.isTest) return null;
  if (status === "REJECTED") return "rejected";
  if (status === "RETURNED") return "corrections";
  if (status === "ACCEPTED") return offerResponse === "DECLINED" ? null : "offered";
  if (!submittedAt && ["DRAFT", "PENDING"].includes(status)) return "waiting";
  if (!readyForReview(application)) return null;
  if (screeningStatus === "FAILED") return "failed";
  if (["PASSED", "EXEMPT"].includes(screeningStatus)) return "passed";
  if (["APPROVED", "SCHEDULED"].includes(screeningStatus) || status === "INTERVIEW_SCHEDULED") return "screening";
  return "submitted";
}

const conflict = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });
const eventKind = (audience) => audience === "waiting" ? "APPLICATION_REMINDER" : `BULK_${audience.toUpperCase()}`;

export async function bulkNotificationPreview(database, audience, now = new Date(), ids) {
  const kind = eventKind(audience);
  const recentMessages = audience === "corrections" ? { OR: [{ kind }, { kind: "STATUS", toStatus: "RETURNED" }] } : audience === "offered" ? { OR: [{ kind }, { kind: "STATUS", toStatus: "ACCEPTED" }] } : { kind };
  const closingDate = audience === "waiting" ? (await getAdmissionsPolicy(database)).closingDate : null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (audience === "waiting" && (!closingDate || closingDate < today)) throw conflict("Set a current or future application submission deadline in Admissions setup before sending reminders.", 422);
  const records = await database.application.findMany({
    where: { isTest: false, ...(ids ? { id: { in: ids } } : {}), applicant: { isActive: true, role: "APPLICANT" } },
    select: { id: true, fullName: true, status: true, submittedAt: true, screeningStatus: true, offerResponse: true, formFeeAmount: true,
      applicant: { select: { email: true } }, payments: { select: { status: true, type: true, amount: true, currency: true, provider: true, isTest: true } },
      statusHistory: { where: { ...recentMessages, createdAt: { gte: new Date(now.getTime() - 86400000) } }, take: 1, select: { id: true } } },
    orderBy: [{ fullName: "asc" }, { id: "asc" }]
  });
  const matching = records.filter((record) => notificationAudience(record) === audience);
  const recipients = matching.filter((record) => !record.statusHistory.length);
  if (recipients.length > bulkLimit) throw conflict(`This group exceeds the ${bulkLimit}-recipient limit. No notifications were sent.`, 422);
  const [subject, message] = bulkAudiences[audience];
  return { recipients, subject, message, closingDate, recentlyNotified: matching.length - recipients.length };
}

export async function sendBulkApplicationNotification(database, input, actor, now = new Date()) {
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT id FROM applications WHERE id IN (${Prisma.join(input.ids)}) ORDER BY id FOR UPDATE`;
    const { recipients, subject, message, closingDate } = await bulkNotificationPreview(transaction, input.audience, now, input.ids);
    if (recipients.length !== input.ids.length || closingDate !== input.closingDate) throw conflict("Recipients or the deadline changed. Preview the group again before sending.");
    const deadline = closingDate && new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(new Date(closingDate));
    const events = recipients.map((record) => ({
      applicationId: record.id, kind: eventKind(input.audience), fromStatus: record.status, toStatus: record.status,
      changedBy: actor.name, notificationSubject: subject,
      notificationText: [`Dear ${record.fullName},`, deadline ? `Submit your application by 11:59 pm WAT on ${deadline}. ${message}` : input.message || message, "Sign in: https://apply.uniquecollegekwali.com/", "Admissions Office"].join("\n\n"),
      emailRecipient: record.applicant.email, emailStatus: "PENDING"
    }));
    const saved = await transaction.applicationStatusHistory.createManyAndReturn({ data: events, select: { id: true } });
    await transaction.auditLog.create({ data: { actorId: actor.id, action: `application.bulk_notification:${input.audience}`, targetType: "application_batch", targetId: saved[0].id } });
    return saved;
  }, { timeout: 15000 });
}
