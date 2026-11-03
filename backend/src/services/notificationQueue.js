import { setTimeout as pause } from "node:timers/promises";
import { prisma } from "../config/prisma.js";
import { deliverStatusEmail, retryableStatusEmails, statusEmailConfigured } from "./statusEmail.js";

export async function processNotificationQueue({ database = prisma, configuration = process.env, now = new Date(), limit = 20, request = fetch, wait = pause } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Notification batch must contain between 1 and 50 records");
  if (!statusEmailConfigured(configuration)) return { configured: false, attempted: 0, sent: 0, failed: 0, unchanged: 0 };
  const notifications = await database.applicationStatusHistory.findMany({ where: retryableStatusEmails(now), orderBy: [{ emailLastAttemptAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }, { id: "asc" }], take: limit, select: { id: true } });
  const result = { configured: true, attempted: 0, sent: 0, failed: 0, unchanged: 0 };
  for (const notification of notifications) {
    if (result.attempted) await wait(550);
    const delivery = await deliverStatusEmail(notification.id, { database, configuration, request });
    result.attempted++;
    if (delivery.status === "SENT") result.sent++;
    else if (delivery.status === "FAILED") result.failed++;
    else result.unchanged++;
  }
  return result;
}
