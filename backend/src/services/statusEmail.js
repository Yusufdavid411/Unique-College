import { prisma } from "../config/prisma.js";

export function statusEmailConfigured(configuration = process.env) {
  return Boolean(configuration.RESEND_API_KEY && configuration.RESEND_FROM_EMAIL);
}

export function statusEmailContent(event) {
  const labels = { SUBMITTED: "Under review", REVIEWED: "Under review", RETURNED: "Corrections required", ACCEPTED: "Application accepted", ADMITTED: "Admitted", REJECTED: "Application decision", INTERVIEW_SCHEDULED: "Interview scheduled" };
  const status = labels[event.toStatus] || "Application status updated";
  const instructions = event.toStatus === "RETURNED"
    ? "Sign in, read the admissions note, correct your form or documents, and submit again."
    : ["ACCEPTED", "ADMITTED"].includes(event.toStatus)
      ? "Your application has been accepted. Sign in to download your application form and see the next steps."
      : event.toStatus === "SUBMITTED" || event.toStatus === "REVIEWED"
        ? "Your application is under review. Please check back later for the admissions decision."
        : "Sign in to view your application status and the admissions office's instructions.";
  return {
    subject: `${event.application?.isTest ? "[TEST] " : ""}Unique College: ${status}`,
    text: [`Unique College of Health Science and Technology`, event.application?.isTest ? "TEST SIMULATION — NOT A REAL ADMISSION OR PAYMENT" : "", `Application status: ${status}`, instructions, "", "Open your applicant portal: https://apply.uniquecollegekwali.com/", "", "This is an automated status notification. Your full records and any correction notes are available securely in the portal."].join("\n")
  };
}

export async function deliverStatusEmail(eventId, { database = prisma, request = fetch, configuration = process.env, now = new Date() } = {}) {
  if (!statusEmailConfigured(configuration)) return { status: "NOT_CONFIGURED" };
  const retryBefore = new Date(now.getTime() - 60000);
  const staleBefore = new Date(now.getTime() - 120000);
  const idempotencyWindow = new Date(now.getTime() - 23 * 60 * 60 * 1000);
  const claimed = await database.applicationStatusHistory.updateMany({
    where: { id: eventId, emailRecipient: { not: null }, OR: [
      { emailStatus: "PENDING" },
      { emailStatus: "FAILED", emailLastAttemptAt: { lt: retryBefore }, OR: [{ emailError: { not: "DELIVERY_UNCONFIRMED" } }, { createdAt: { gt: idempotencyWindow } }] },
      { emailStatus: "SENDING", emailLastAttemptAt: { lt: staleBefore }, createdAt: { gt: idempotencyWindow } }
    ] },
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
