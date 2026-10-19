import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { permissionKeys } from "../services/permissions.js";
import { auditedMutation } from "../services/audit.js";

const router = Router();
router.use(requireAuth, requirePermission("roles.manage"));
router.get("/users", asyncHandler(async (req, res) => {
  const query = z.object({ search: z.string().trim().max(100).default("") }).parse(req.query);
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] }, ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] } : {}) },
    select: { id: true, name: true, email: true, role: true, isActive: true, roleAssignments: { select: { roleId: true } } },
    orderBy: { name: "asc" }, take: 100
  });
  ok(res, users);
}));
router.get("/", asyncHandler(async (req, res) => {
  ok(res, { roles: await prisma.accessRole.findMany({ orderBy: { name: "asc" } }), permissions: permissionKeys });
}));
router.post("/", asyncHandler(async (req, res) => {
  const data = z.object({ name: z.string().trim().min(2).max(80), permissions: z.array(z.enum(permissionKeys)).max(permissionKeys.length) }).parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "role.created", targetType: "role" }, (transaction) => transaction.accessRole.create({ data })));
}));
router.put("/:roleId", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.roleId);
  const data = z.object({ name: z.string().trim().min(2).max(80), permissions: z.array(z.enum(permissionKeys)).max(permissionKeys.length) }).parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "role.updated", targetType: "role", targetId: id }, (transaction) => transaction.accessRole.update({ where: { id }, data })));
}));
router.put("/:roleId/users/:userId", asyncHandler(async (req, res) => {
  const { roleId, userId } = z.object({ roleId: z.string().uuid(), userId: z.string().uuid() }).parse(req.params);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !["ADMIN", "STAFF"].includes(user.role)) return res.status(422).json({ success: false, message: "Roles can only be assigned to active staff or administrators" });
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "role.assigned:" + roleId, targetType: "user", targetId: userId }, (transaction) => transaction.userRoleAssignment.upsert({ where: { userId_roleId: { userId, roleId } }, update: {}, create: { userId, roleId } })));
}));
router.delete("/:roleId/users/:userId", asyncHandler(async (req, res) => {
  const { roleId, userId } = z.object({ roleId: z.string().uuid(), userId: z.string().uuid() }).parse(req.params);
  await auditedMutation(prisma, { actorId: req.user.id, action: "role.revoked:" + roleId, targetType: "user", targetId: userId }, (transaction) => transaction.userRoleAssignment.deleteMany({ where: { userId, roleId } }));
  ok(res, null, "Role assignment removed");
}));
export default router;
