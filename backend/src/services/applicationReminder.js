import { getAdmissionsPolicy } from "./admissionsPolicy.js";

const conflict = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });

export async function createApplicationReminder(database, applicationId, actor, now = new Date()) {
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT id FROM applications WHERE id = ${applicationId} FOR UPDATE`;
    const application = await transaction.application.findUnique({ where: { id: applicationId }, include: { applicant: { select: { email: true, role: true, isActive: true } } } });
    if (!application) throw conflict("Application not found.", 404);
    if (application.submittedAt || !["DRAFT", "PENDING"].includes(application.status)) throw conflict("Reminders are available only for applications awaiting submission. Refresh this application.");
    if (!application.applicant?.isActive || application.applicant.role !== "APPLICANT") throw conflict("No active applicant account is linked to this application.");
    const { closingDate } = await getAdmissionsPolicy(transaction);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    if (!closingDate || closingDate < today) throw conflict("Set a current or future application submission deadline in Settings → Admissions availability before sending reminders.", 422);
    const previous = await transaction.applicationStatusHistory.findFirst({ where: { applicationId, kind: "APPLICATION_REMINDER", createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }, orderBy: { createdAt: "desc" } });
    if (previous) throw conflict("A reminder was already sent to this applicant within the last 24 hours. Use Retry email notification if delivery failed.", 429);
    const deadline = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "full" }).format(new Date(closingDate + "T12:00:00+01:00"));
    const text = `Dear ${application.fullName},\n\nYour application to Unique College of Health Science and Technology is awaiting submission. The application submission deadline is ${deadline}, at 11:59 pm (WAT).\n\nPlease sign in to https://apply.uniquecollegekwali.com/ to continue from where you stopped, complete your form, upload the required documents and submit for admissions review before the deadline.\n\nIf you have already submitted, please refresh your portal to check your current status.\n\nAdmissions Office\nUnique College of Health Science and Technology`;
    const event = await transaction.applicationStatusHistory.create({ data: { applicationId, kind: "APPLICATION_REMINDER", fromStatus: application.status, toStatus: application.status, changedBy: actor.name, notificationSubject: "Complete your application before the deadline", notificationText: text, note: `Application completion reminder. Submission deadline: ${closingDate} (WAT).`, emailRecipient: application.applicant.email, emailStatus: "PENDING" } });
    await transaction.auditLog.create({ data: { actorId: actor.id, action: "application.reminder_sent", targetType: "application", targetId: applicationId } });
    return event;
  }, { maxWait: 10000, timeout: 15000 });
}
