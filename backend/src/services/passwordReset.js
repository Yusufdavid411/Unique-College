import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { statusEmailConfigured } from "./statusEmail.js";

export const resetPasswordSchema = z.string().min(12, "Use at least 12 characters").max(72)
  .regex(/[A-Z]/, "Add an uppercase letter").regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number").refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Use at most 72 bytes");
export const resetRequestSchema = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) });
const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");
const unavailable = () => Object.assign(new Error("Password-reset email is temporarily unavailable. Please contact the school."), { statusCode: 503 });

export function passwordResetUrl(role, token) {
  const host = role === "STUDENT" ? "portal" : ["ADMIN", "STAFF"].includes(role) ? "admin" : "apply";
  return `https://${host}.uniquecollegekwali.com/reset-password#${token}`;
}

export async function requestPasswordReset(email, { database = prisma, configuration = process.env, request = fetch, actorId = null, now = new Date() } = {}) {
  if (!statusEmailConfigured(configuration)) throw unavailable();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  const issued = await database.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({ where: { email } });
    if (!user?.isActive) return null;
    await transaction.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    const previous = await transaction.passwordReset.findUnique({ where: { userId: user.id } });
    if (previous && now.getTime() - previous.createdAt.getTime() < 60000) return null;
    const data = { tokenHash, sessionVersion: user.sessionVersion, expiresAt: new Date(now.getTime() + 30 * 60000), createdAt: now };
    await transaction.passwordReset.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    await transaction.auditLog.create({ data: { actorId: actorId || user.id, action: "user.password_reset_requested", targetType: "user", targetId: user.id } });
    return user;
  }, { maxWait: 10000, timeout: 15000 });
  if (!issued) return;
  try {
    const response = await request("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.RESEND_API_KEY}`, "Idempotency-Key": `password-reset/${tokenHash}` },
      body: JSON.stringify({ from: configuration.RESEND_FROM_EMAIL, to: [issued.email], subject: "Reset your Unique College password", text: `A password reset was requested for your Unique College account.\n\nChoose a new password here:\n${passwordResetUrl(issued.role, token)}\n\nThis link expires in 30 minutes and can only be used once. If you did not request this, ignore this email. Your password has not changed.` })
    });
    if (!response.ok || !(await response.json()).id) throw unavailable();
  } catch {
    await database.passwordReset.deleteMany({ where: { userId: issued.id, tokenHash } });
  }
}

export async function completePasswordReset(token, password, { database = prisma, now = new Date() } = {}) {
  const tokenHash = digest(token);
  const passwordHash = await bcrypt.hash(password, 12);
  await database.$transaction(async (transaction) => {
    const reset = await transaction.passwordReset.findUnique({ where: { tokenHash } });
    const invalid = () => Object.assign(new Error("This reset link is invalid or expired. Request a new link."), { statusCode: 400 });
    if (!reset || reset.expiresAt <= now) throw invalid();
    const consumed = await transaction.passwordReset.deleteMany({ where: { userId: reset.userId, tokenHash, expiresAt: { gt: now } } });
    if (!consumed.count) throw invalid();
    const changed = await transaction.user.updateMany({ where: { id: reset.userId, isActive: true, sessionVersion: reset.sessionVersion }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    if (!changed.count) throw invalid();
    await transaction.auditLog.create({ data: { actorId: reset.userId, action: "user.password_reset_completed", targetType: "user", targetId: reset.userId } });
  }, { maxWait: 10000, timeout: 15000 });
}
