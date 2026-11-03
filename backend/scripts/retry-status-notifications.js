import { prisma } from "../src/config/prisma.js";
import { processNotificationQueue } from "../src/services/notificationQueue.js";

try {
  const result = await processNotificationQueue();
  if (!result.configured) throw new Error("Configure RESEND_API_KEY and a verified RESEND_FROM_EMAIL before retrying.");
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error.message.startsWith("Configure ") ? error.message : "Notification retries failed. Check database connectivity and sender configuration.");
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
