import { prisma } from "../src/config/prisma.js";
import { deliverStatusEmail, statusEmailConfigured } from "../src/services/statusEmail.js";

try {
  if (!statusEmailConfigured()) throw new Error("Configure RESEND_API_KEY and a verified RESEND_FROM_EMAIL before retrying.");
  const notifications = await prisma.applicationStatusHistory.findMany({
    where: { emailStatus: { in: ["PENDING", "FAILED", "SENDING"] }, emailRecipient: { not: null } },
    orderBy: { createdAt: "asc" }, take: 50, select: { id: true }
  });
  const results = {};
  for (const notification of notifications) {
    const result = await deliverStatusEmail(notification.id);
    results[result.status] = (results[result.status] || 0) + 1;
  }
  console.log(JSON.stringify({ attempted: notifications.length, results }));
} catch (error) {
  console.error(error.message.startsWith("Configure ") ? error.message : "Notification retries failed. Check database connectivity and sender configuration.");
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
