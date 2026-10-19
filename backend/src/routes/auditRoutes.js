import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();
router.get("/", requireAuth, requirePermission("audit.read"), asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    actorId: z.string().uuid().optional(),
    targetId: z.string().uuid().optional()
  }).parse(req.query);
  const where = { actorId: query.actorId, targetId: query.targetId };
  const [entries, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.auditLog.count({ where })
  ]);
  ok(res, { entries, total, page: query.page, limit: query.limit });
}));
export default router;
