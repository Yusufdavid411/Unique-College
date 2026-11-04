import { prisma } from "../config/prisma.js";
import { applicationStatusMessage } from "./admissionWorkflow.js";

export function statusEmailConfigured(configuration = process.env) {
  return Boolean(configuration.RESEND_API_KEY && configuration.RESEND_FROM_EMAIL);
}

export function statusEmailContent(event) {
  if (event.notificationSubject && event.notificationText) return {
    subject: `${event.application?.isTest ? "[TEST] " : ""}Unique College: ${event.notificationSubject}`,
    text: ["Unique College of Health Science and Technology", event.application?.isTest ? "TEST RECORD — NOT VALID FOR REAL ADMISSION" : "", event.notificationText, "", "View your secure applicant portal: https://apply.uniquecollegekwali.com/"].filter(Boolean).join("\n")
  };
  const labels = { SUBMITTED: "Under review", REVIEWED: "Under review", RETURNED: "Corrections required", ACCEPTED: "Application accepted", ADMITTED: "Admitted", REJECTED: "Application rejected", INTERVIEW_SCHEDULED: "Screening scheduled" };
  const status = event.kind === "OFFER_RESPONSE" ? "Offer response recorded" : event.kind === "CLEARANCE" ? "Clearance updated" : labels[event.toStatus] || "Application status updated";
  const instructions = ["OFFER_RESPONSE", "CLEARANCE"].includes(event.kind) ? "Sign in to see your offer response, acceptance payment and clearance progress."
    : event.toStatus === "ADMITTED" ? "Sign in at https://portal.uniquecollegekwali.com/ using your existing email and password. Your application and admission documents remain available in the applicant portal."
    : event.toStatus === "REJECTED"
    ? "Sign in to read the reason from admissions. Contact admissions if you need to correct and resubmit your application."
    : event.toStatus === "RETURNED" || event.toStatus === "INTERVIEW_SCHEDULED"
    ? applicationStatusMessage(event.toStatus)
    : event.toStatus === "ACCEPTED"
      ? "An admission offer is available. Sign in to accept or decline it, download your application, view your quoted acceptance fee and track clearance. Final admission follows these checks."
      : event.toStatus === "SUBMITTED" || event.toStatus === "REVIEWED"
        ? "Your application is under review. Please check back later for the admissions decision."
        : "Sign in to view your application status and the admissions office's instructions.";
  return {
    subject: `${event.application?.isTest ? "[TEST] " : ""}Unique College: ${status}`,
    text: [`Unique College of Health Science and Technology`, event.application?.isTest ? "TEST SIMULATION — NOT A REAL ADMISSION OR PAYMENT" : "", `Application status: ${status}`, instructions, "", "Open your applicant portal: https://apply.uniquecollegekwali.com/", "", "This is an automated status notification. Your full records and any correction notes are available securely in the portal."].join("\n")
  };
}

export function retryableStatusEmails(now = new Date()) {
  const retryBefore = new Date(now.getTime() - 60000);
  const staleBefore = new Date(now.getTime() - 120000);
  const idempotencyWindow = new Date(now.getTime() - 23 * 60 * 60 * 1000);
  return { emailRecipient: { not: null }, OR: [
      { emailStatus: "PENDING" },
      { emailStatus: "FAILED", emailLastAttemptAt: { lt: retryBefore }, OR: [{ emailError: { not: "DELIVERY_UNCONFIRMED" } }, { createdAt: { gt: idempotencyWindow } }] },
      { emailStatus: "SENDING", emailLastAttemptAt: { lt: staleBefore }, createdAt: { gt: idempotencyWindow } }
    ] };
}

export async function deliverStatusEmail(eventId, { database = prisma, request = fetch, configuration = process.env, now = new Date() } = {}) {
  if (!statusEmailConfigured(configuration)) return { status: "NOT_CONFIGURED" };
  const claimed = await database.applicationStatusHistory.updateMany({
    where: { id: eventId, ...retryableStatusEmails(now) },
    data: { emailStatus: "SENDING", emailLastAttemptAt: now, emailAttempts: { increment: 1 }, emailError: null }
  });
  if (!claimed.count) return { status: "UNCHANGED" };
  const event = await database.applicationStatusHistory.findUnique({ where: { id: eventId }, include: { application: { select: { isTest: true } } } });
  if (!event) return { status: "UNCHANGED" };
  try {
    const response = await request("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.RESEND_API_KEY}`, "Idempotency-Key": `admissions-status/${event.id}` },
      body: JSON.stringify({ from: configuration.RESEND_FROM_EMAIL, to: [event.emailRecipient], ...statusEmailContent(event) })
    });
    if (!response.ok) throw Object.assign(new Error("Email provider rejected request"), { providerStatus: response.status });
    const result = await response.json();
    if (!result.id) throw new Error("Email provider response was incomplete");
    await database.applicationStatusHistory.update({ where: { id: event.id }, data: { emailStatus: "SENT", emailSentAt: now, emailError: null } });
    return { status: "SENT" };
  } catch (error) {
    await database.applicationStatusHistory.update({ where: { id: event.id }, data: { emailStatus: "FAILED", emailError: error.providerStatus ? `PROVIDER_${error.providerStatus}` : "DELIVERY_UNCONFIRMED" } });
    return { status: "FAILED" };
  }
}

export async function attemptStatusEmail(eventId) {
  if (!eventId) return { status: "NOT_REQUIRED" };
  try { return await deliverStatusEmail(eventId); }
  catch { return { status: "PENDING" }; }
}
