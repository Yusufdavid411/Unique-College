import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditedMutation } from "../services/audit.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();
const fields = z.object({ title: z.string().trim().min(3).max(160), body: z.string().trim().min(5).max(6000), isPublished: z.boolean() });
router.use(requireAuth, requirePermission("announcements.manage"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/", asyncHandler(async (req, res) => {
  const { page } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(req.query);
  const [items, total] = await prisma.$transaction([prisma.studentAnnouncement.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25 }), prisma.studentAnnouncement.count()]);
  ok(res, { items, total, page });
}));
router.post("/", asyncHandler(async (req, res) => {
  const data = fields.strict().parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: "announcement.created", targetType: "announcement" }, (database) => database.studentAnnouncement.create({ data: { ...data, publishedAt: data.isPublished ? new Date() : null } })), "Announcement saved.");
}));
router.patch("/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { version, ...data } = fields.extend({ version: z.string().datetime() }).strict().parse(req.body);
  await auditedMutation(prisma, { actorId: req.user.id, action: "announcement.updated", targetType: "announcement", targetId: id }, async (database) => {
    const current = await database.studentAnnouncement.findUnique({ where: { id } });
    if (!current) throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    const changed = await database.studentAnnouncement.updateMany({ where: { id, updatedAt: new Date(version) }, data: { ...data, publishedAt: data.isPublished && !current.isPublished ? new Date() : current.publishedAt } });
    if (!changed.count) throw Object.assign(new Error("The announcement changed. Refresh before saving again."), { statusCode: 409 });
    return changed;
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, null, "Announcement updated.");
}));
export default router;
