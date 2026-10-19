import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { auditedMutation } from "../services/audit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

const safeSelection = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };
const router = Router();
router.use(requireAuth, requirePermission("users.manage"));
router.get("/", asyncHandler(async (req, res) => {
  const { page, search } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), search: z.string().trim().max(100).default("") }).parse(req.query);
  const where = { role: { in: ["ADMIN", "STAFF"] }, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) };
  const [users, total] = await prisma.$transaction([prisma.user.findMany({ where, select: safeSelection, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25 }), prisma.user.count({ where })]);
  ok(res, { users, total, page });
}));
router.post("/", asyncHandler(async (req, res) => {
  const data = z.object({ name: z.string().trim().min(2).max(150), email: z.string().trim().email().transform((value) => value.toLowerCase()) }).parse(req.body);
  const temporaryPassword = "Uc!" + crypto.randomBytes(16).toString("base64url") + "7";
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const user = await auditedMutation(prisma, { actorId: req.user.id, action: "staff.created", targetType: "user" }, (transaction) => transaction.user.create({ data: { ...data, passwordHash, role: "STAFF", mustChangePassword: true }, select: safeSelection }));
  ok(res, { user, temporaryPassword }, "Staff account created. Share credentials securely.");
}));
router.patch("/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = z.object({ isActive: z.boolean() }).parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: data.isActive ? "staff.activated" : "staff.deactivated", targetType: "user", targetId: id }, async (transaction) => {
    const updated = await transaction.user.updateMany({ where: { id, role: "STAFF" }, data: { isActive: data.isActive, sessionVersion: { increment: 1 } } });
    if (!updated.count) throw Object.assign(new Error("Staff account not found. Administrator access is managed separately."), { statusCode: 404 });
    return updated;
  });
  ok(res, result, "Staff access updated");
}));
export default router;
