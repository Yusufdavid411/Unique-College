import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginAdmin, loginApplicant, toPublicUser } from "../services/authService.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { auditedMutation } from "../services/audit.js";

export const changePassword = asyncHandler(async (req, res) => {
  const body = z.object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    password: z.string()
      .min(12, "Use at least 12 characters")
      .max(72, "Use no more than 72 characters")
      .regex(/[A-Z]/, "Add at least one uppercase letter (A-Z)")
      .regex(/[a-z]/, "Add at least one lowercase letter (a-z)")
      .regex(/[0-9]/, "Add at least one number (0-9)")
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "This password is too long when encoded. Shorten it to 72 bytes or fewer")
  }).parse(req.body);
  if (!(await bcrypt.compare(body.currentPassword, req.user.passwordHash))) return res.status(400).json({ success: false, message: "Current password is incorrect" });
  if (await bcrypt.compare(body.password, req.user.passwordHash)) return res.status(422).json({ success: false, message: "Choose a different password" });
  const passwordHash = await bcrypt.hash(body.password, 12);
  await auditedMutation(prisma, { actorId: req.user.id, action: "user.password_changed", targetType: "user", targetId: req.user.id }, (transaction) => transaction.user.update({ where: { id: req.user.id }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } }));
  ok(res, null, "Password changed. Sign in again with your new password.");
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginAdmin(req.body.email, req.body.password);
  ok(res, result, "Login successful");
});

export const applicantLogin = asyncHandler(async (req, res) => {
  const result = await loginApplicant(req.body.identifier, req.body.password);
  ok(res, result, "Login successful");
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: toPublicUser(req.user) });
});
