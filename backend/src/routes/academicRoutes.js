import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditedMutation } from "../services/audit.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();
const code = z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9/_-]+$/));
const name = z.string().trim().min(2).max(200);
const types = {
  departments: { model: "academicDepartment", schema: z.object({ code, name }).strict() },
  programmes: { model: "academicProgramme", schema: z.object({ code, name, departmentId: z.string().uuid() }).strict() },
  sessions: { model: "academicSession", schema: z.object({ name, startsAt: z.coerce.date(), endsAt: z.coerce.date() }).strict().refine((value) => value.endsAt > value.startsAt, { path: ["endsAt"], message: "Session end date must follow its start date" }) },
  levels: { model: "academicLevel", schema: z.object({ code, name }).strict() }
};
router.use(requireAuth, (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/options", requireAnyPermission("students.read", "academic.manage"), asyncHandler(async (req, res) => {
  const [departments, programmes, sessions, levels] = await prisma.$transaction([
    prisma.academicDepartment.findMany({ orderBy: { name: "asc" }, take: 1000 }),
    prisma.academicProgramme.findMany({ include: { department: true }, orderBy: { name: "asc" }, take: 1000 }),
    prisma.academicSession.findMany({ orderBy: { startsAt: "desc" }, take: 1000 }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, take: 1000 })
  ]);
  ok(res, { departments, programmes, sessions, levels });
}));
router.post("/:type", requirePermission("academic.manage"), asyncHandler(async (req, res) => {
  const type = z.enum(["departments", "programmes", "sessions", "levels"]).parse(req.params.type);
  const specification = types[type];
  const data = specification.schema.parse(req.body);
  const result = await auditedMutation(prisma, { actorId: req.user.id, action: `academic.${type}.created`, targetType: "academic_record" }, async (database) => {
    if (type === "programmes") {
      const department = await database.academicDepartment.findUnique({ where: { id: data.departmentId } });
      if (!department?.isActive) throw Object.assign(new Error("Select an active department."), { statusCode: 422 });
    }
    return database[specification.model].create({ data });
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, result, "Academic record created.");
}));
router.patch("/:type/:id", requirePermission("academic.manage"), asyncHandler(async (req, res) => {
  const type = z.enum(["departments", "programmes", "sessions", "levels"]).parse(req.params.type);
  const id = z.string().uuid().parse(req.params.id);
  const data = z.object({ isActive: z.boolean() }).strict().parse(req.body);
  ok(res, await auditedMutation(prisma, { actorId: req.user.id, action: `academic.${type}.${data.isActive ? "enabled" : "disabled"}`, targetType: "academic_record", targetId: id }, (database) => database[types[type].model].update({ where: { id }, data })), "Availability updated. Existing records are retained.");
}));
export default router;
