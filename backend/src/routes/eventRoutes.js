import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { auditedMutation } from "../services/audit.js";

const eventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(10000),
  location: z.string().trim().min(2).max(300),
  startsAt: z.string().datetime().transform((value) => new Date(value)),
  endsAt: z.string().datetime().transform((value) => new Date(value)),
  isPublished: z.boolean()
}).refine((event) => event.endsAt >= event.startsAt, { message: "End time must be after the start time", path: ["endsAt"] });

const router = Router();
router.get("/public", asyncHandler(async (req, res) => {
  ok(res, await prisma.event.findMany({ where: { isPublished: true }, orderBy: { startsAt: "desc" }, take: 100 }));
}));
router.use(requireAuth, requirePermission("content.manage"));
router.get("/", asyncHandler(async (req, res) => {
  ok(res, await prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 200 }));
}));
router.post("/", asyncHandler(async (req, res) => {
  const data = eventSchema.parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "event.created", targetType: "event" }, (transaction) => transaction.event.create({ data })));
}));
router.put("/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = eventSchema.parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "event.updated", targetType: "event", targetId: id }, (transaction) => transaction.event.update({ where: { id }, data })));
}));
router.delete("/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await auditedMutation(prisma, { actorId: req.user.id, action: "event.deleted", targetType: "event", targetId: id }, (transaction) => transaction.event.delete({ where: { id } }));
  ok(res, null, "Event removed");
}));
export default router;
