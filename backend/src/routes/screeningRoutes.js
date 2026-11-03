import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { readyForReview } from "../services/applicationReview.js";
import { documentsPolicy, screeningPolicy, screeningProgress, renderAdmissionMessage } from "../services/admissionDocuments.js";
import { attemptStatusEmail, statusEmailConfigured } from "../services/statusEmail.js";
import { processNotificationQueue } from "../services/notificationQueue.js";

const router = Router();
const conflict = (message) => Object.assign(new Error(message), { statusCode: 409 });
router.use(requireAuth, (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.post("/schedule", requirePermission("applications.review"), asyncHandler(async (req, res) => {
  const input = z.object({ ids: z.array(z.string().uuid()).min(1).max(50), date: z.string().datetime(), venue: z.string().trim().min(3).max(250), instructions: z.string().trim().max(1500).default("") }).strict().parse(req.body);
  if (new Set(input.ids).size !== input.ids.length) return res.status(422).json({ message: "Select each applicant once." });
  const date = new Date(input.date);
  if (date < new Date(Date.now() + 60000)) return res.status(422).json({ message: "Choose a future examination date and time." });
  const result = await prisma.$transaction(async (database) => {
    const records = await database.application.findMany({ where: { id: { in: input.ids } }, include: { payments: true, applicant: { select: { email: true, isActive: true } } } });
    if (records.length !== input.ids.length || records.some((record) => !record.applicant?.isActive || !readyForReview(record) || !["SUBMITTED", "PENDING", "REVIEWED", "INTERVIEW_SCHEDULED"].includes(record.status) || !["NOT_SCHEDULED", "SCHEDULED"].includes(record.screeningStatus))) throw conflict("Only active applicants with paid, submitted applications awaiting screening may be scheduled. Refresh the selection.");
    if (new Set(records.map((record) => record.isTest)).size > 1) throw conflict("Preview and real applicants must be scheduled separately.");
    const targets = records.filter((record) => record.status !== "INTERVIEW_SCHEDULED" || record.screeningAt?.getTime() !== date.getTime() || record.screeningVenue !== input.venue || (record.screeningInstructions || "") !== input.instructions);
    if (!targets.length) return [];
    const fee = await screeningPolicy(database);
    const policy = await documentsPolicy(database);
    const ids = targets.map((record) => record.id);
    await database.application.updateMany({ where: { id: { in: ids }, screeningFeeAmount: null }, data: { screeningFeeAmount: fee.amount } });
    await database.application.updateMany({ where: { id: { in: ids } }, data: { status: "INTERVIEW_SCHEDULED", screeningStatus: "SCHEDULED", screeningAt: date, screeningVenue: input.venue, screeningInstructions: input.instructions } });
    const dateLabel = `${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" }).format(date)} (WAT)`;
    const events = targets.map((record) => {
      const message = renderAdmissionMessage(policy.screeningMessage, { date: dateLabel, venue: input.venue, instructions: input.instructions, programme: record.courseOfInterest });
      const details = [!policy.screeningMessage.includes("{date}") && `Date and time: ${dateLabel}`, !policy.screeningMessage.includes("{venue}") && `Venue: ${input.venue}`, input.instructions && !policy.screeningMessage.includes("{instructions}") && `Instructions: ${input.instructions}`].filter(Boolean);
      return { id: crypto.randomUUID(), applicationId: record.id, kind: "SCREENING_SCHEDULE", fromStatus: record.status, toStatus: "INTERVIEW_SCHEDULED", changedBy: req.user.name,
        note: `Screening scheduled: ${dateLabel}. ${input.venue}. ${input.instructions}`,
        notificationSubject: "Entrance examination / screening invitation", notificationText: [message, ...details].join("\n"),
        emailStatus: "PENDING", emailRecipient: record.applicant.email };
    });
    await database.applicationStatusHistory.createMany({ data: events });
    await database.auditLog.create({ data: { actorId: req.user.id, action: "screening.scheduled", targetType: "application_batch", targetId: crypto.randomUUID() } });
    return events.map((event) => event.id);
  }, { isolationLevel: "Serializable", timeout: 25000 });
  const delivery = [];
  if (statusEmailConfigured()) for (let offset = 0; offset < result.length; offset += 10) delivery.push(...await Promise.all(result.slice(offset, offset + 10).map((id) => attemptStatusEmail(id))));
  ok(res, { scheduled: result.length, emailConfigured: statusEmailConfigured(), submittedToEmailProvider: delivery.filter((item) => item.status === "SENT").length, queuedForDelivery: result.length - delivery.filter((item) => item.status === "SENT").length }, "Screening schedules saved. Portal notifications are available; email delivery status is shown separately.");
}));
router.patch("/:id/result", requirePermission("applications.admit"), asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = z.object({ outcome: z.enum(["PASSED", "FAILED"]), score: z.number().min(0).max(100).nullable(), note: z.string().trim().max(1500).default("") }).strict().parse(req.body);
  const eventId = await prisma.$transaction(async (database) => {
    const record = await database.application.findUnique({ where: { id }, include: { payments: true } });
    if (!record || !readyForReview(record)) throw conflict("A submitted, paid application is required.");
    if (record.screeningStatus === data.outcome && record.entranceExamScore === data.score) return null;
    if (record.status !== "INTERVIEW_SCHEDULED" || record.screeningStatus !== "SCHEDULED" || !screeningProgress(record).paid || !record.screeningAt || record.screeningAt > new Date()) throw conflict("Record results only after the active scheduled exam, with the screening fee confirmed. Published results require a separate correction process.");
    const policy = await documentsPolicy(database);
    const text = renderAdmissionMessage(data.outcome === "PASSED" ? policy.passedMessage : policy.failedMessage, { date: new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" }).format(record.screeningAt), venue: record.screeningVenue, instructions: record.screeningInstructions, programme: record.courseOfInterest });
    await database.application.update({ where: { id }, data: { screeningStatus: data.outcome, screeningResultAt: new Date(), entranceExamScore: data.score, status: "REVIEWED" } });
    const event = await database.applicationStatusHistory.create({ data: { applicationId: id, fromStatus: record.status, toStatus: "REVIEWED", kind: "SCREENING_RESULT", note: data.note || `Screening ${data.outcome.toLowerCase()}.`, changedBy: req.user.name, notificationSubject: data.outcome === "PASSED" ? "Screening successful" : "Screening result available", notificationText: text, emailRecipient: record.email, emailStatus: "PENDING" } });
    await database.auditLog.create({ data: { actorId: req.user.id, action: "screening.result:" + data.outcome, targetType: "application", targetId: id } });
    return event.id;
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, { email: await attemptStatusEmail(eventId) }, "Screening result published in the portal.");
}));
router.post("/dispatch", requirePermission("applications.review"), asyncHandler(async (req, res) => {
  if (!statusEmailConfigured()) return res.status(503).json({ message: "Email delivery is not configured. Portal notifications are available; configure the verified school sender to send email." });
  const result = await processNotificationQueue({ limit: 5 });
  ok(res, result, "Email queue batch processed. Check notification history for delivery status.");
}));
export default router;
