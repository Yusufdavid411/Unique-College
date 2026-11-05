import fs from "node:fs/promises";
import { prisma } from "../config/prisma.js";
import { paymentConfiguration, paymentConfigurationIssue } from "./flutterwave.js";
import { documentsPolicy, validateLetterPolicy } from "./admissionDocuments.js";
import { retryableStatusEmails } from "./statusEmail.js";

export function environmentReadiness(configuration, payment) {
  const paymentIssue = paymentConfigurationIssue(payment);
  const checkoutConfigured = payment.enabled && !paymentIssue;
  const sender = configuration.RESEND_FROM_EMAIL || "";
  const schoolSender = /(?:^|<)[^<>\s@]+@(?:[a-z0-9-]+\.)*uniquecollegekwali\.com>?$/i.test(sender.trim());
  const emailConfigured = Boolean(configuration.RESEND_API_KEY && schoolSender);
  const provider = configuration.STORAGE_PROVIDER || "local";
  const durableStorage = provider === "blob" ? Boolean(configuration.BLOB_READ_WRITE_TOKEN) : provider === "s3" ? Boolean(configuration.S3_BUCKET && configuration.S3_REGION && configuration.S3_ACCESS_KEY_ID && configuration.S3_SECRET_ACCESS_KEY) : provider === "local" && configuration.VERCEL !== "1";
  return [
    { id: "payments", title: "Online payments", status: checkoutConfigured ? "CONFIGURED" : "ACTION_REQUIRED", message: checkoutConfigured ? "Flutterwave checkout is configured. Verified payments advance the full admissions workflow." : "Configure Flutterwave credentials and the webhook to enable checkout.", verifiedExternally: false, action: "Keep credentials in the backend environment. Approved live merchant credentials and live mode are required before collecting real funds. Webhook: https://api.uniquecollegekwali.com/api/payments/flutterwave/webhook." },
    { id: "email", title: "School email delivery", status: emailConfigured ? "CONFIGURED" : "ACTION_REQUIRED", message: emailConfigured ? "A school-domain sender and API key are configured. DNS verification and delivery must still be checked with Resend." : "Configure Resend with a verified @uniquecollegekwali.com sender for password resets and admissions messages.", verifiedExternally: false, action: "Verify the sending domain in Resend, add its exact DNS records in Namecheap, then set RESEND_API_KEY and RESEND_FROM_EMAIL securely in the backend project." },
    { id: "storage", title: "Durable file storage", status: durableStorage ? "CONFIGURED" : "ACTION_REQUIRED", message: durableStorage ? `Storage provider: ${["blob", "s3", "local"].includes(provider) ? provider : "unknown"}. Configuration is present; verify file upload/download and maintain independent backups.` : "Configure durable storage before accepting applicant uploads on Vercel.", verifiedExternally: false, action: "Retain PostgreSQL exports and uploaded-file backups separately. A configuration check is not a restoration test." },
    { id: "notifications", title: "Automatic notification retries", status: configuration.CRON_SECRET?.length >= 32 ? "CONFIGURED" : "ACTION_REQUIRED", message: configuration.CRON_SECRET?.length >= 32 ? "The secured daily retry endpoint is configured. Initial delivery is attempted immediately when records change; this job retries eligible queued messages." : "Set a unique CRON_SECRET of at least 32 characters to authorise the daily retry job.", verifiedExternally: false, action: "Vercel retries run daily in the 07:00–08:00 WAT window. Registry can also process a batch from Screening & exams. A VPS scheduler can use the same secured endpoint or worker command." }
  ];
}

export async function platformReadiness({ database = prisma, configuration = process.env, payment = paymentConfiguration(), now = new Date(), access = fs.access } = {}) {
  const checks = environmentReadiness(configuration, payment);
  try {
    await database.$queryRaw`SELECT 1`;
    checks.unshift({ id: "database", title: "Database connection", status: "READY", message: "The API successfully queried PostgreSQL." });
    const policy = await documentsPolicy(database);
    try {
      const required = { session: "academic session", duration: "programme duration", effectiveDate: "admission effective date", registrationOpen: "registration opening date", registrationDeadline: "registration deadline", resultDeadline: "O-level submission deadline", lecturesStart: "lectures start date" };
      const missing = Object.entries(required).filter(([key]) => !policy[key]).map(([, label]) => label);
      if (missing.length) throw Object.assign(new Error(`Admin must set: ${missing.join(", ")}. These details are required on admission letters and related school documents.`), { statusCode: 422 });
      validateLetterPolicy(policy, now);
      checks.push({ id: "letters", title: "Official admission letters", status: "READY", message: "Required dates, session and duration are configured. The fee appendix is attached only when approved." });
    } catch (error) {
      checks.push({ id: "letters", title: "Official admission letters", status: "ACTION_REQUIRED", message: error.statusCode === 422 ? error.message : "Review the admission-letter settings.", action: "Open Screening, messages & admission letters below. Enter approved school details; do not reuse historical example dates." });
    }
    const [eligible, unresolved] = await Promise.all([
      database.applicationStatusHistory.count({ where: retryableStatusEmails(now) }),
      database.applicationStatusHistory.count({ where: { emailRecipient: { not: null }, emailStatus: { in: ["PENDING", "FAILED", "SENDING"] } } })
    ]);
    checks.push({ id: "queue", title: "Admissions email queue", status: unresolved ? "ACTION_REQUIRED" : "READY", message: `${unresolved} unresolved notification(s); ${eligible} eligible for automatic retry now. Provider acceptance is not proof of inbox delivery. Older uncertain deliveries require registry review to avoid duplicate emails.` });
  } catch {
    if (!checks.some((check) => check.id === "database")) checks.unshift({ id: "database", title: "Database connection", status: "ACTION_REQUIRED", message: "The database check failed. Retry shortly or inspect the backend's private logs." });
    else checks.push({ id: "records", title: "Admissions configuration checks", status: "ACTION_REQUIRED", message: "Some configuration or queue checks failed. Inspect settings and migration status; no records were changed." });
  }
  try {
    await Promise.all(["letter", "fees", "acceptance", "guarantor", "student-record"].map((name) => access(new URL(`../../assets/school-${name}.pdf`, import.meta.url))));
    checks.push({ id: "templates", title: "School document templates", status: "READY", message: "The five school-document templates are available to the API." });
  } catch {
    checks.push({ id: "templates", title: "School document templates", status: "ACTION_REQUIRED", message: "One or more original school templates are missing from the API deployment." });
  }
  return { checkedAt: now.toISOString(), readyForActivationReview: checks.every((check) => check.status !== "ACTION_REQUIRED"), checks, note: "These checks report configuration and connectivity, not merchant approval, DNS verification, email delivery, complete security certification or backup restoration." };
}
