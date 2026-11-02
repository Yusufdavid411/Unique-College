import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();
router.get("/", requireAuth, requirePermission("students.read"), asyncHandler(async (req, res) => {
  const { page, search, testing } = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    search: z.string().trim().max(100).default(""),
    testing: z.enum(["true", "false"]).default("false")
  }).parse(req.query);
  const where = {
    status: "ADMITTED", isTest: testing === "true", applicant: { is: { role: "STUDENT" } },
    ...(search ? { OR: ["fullName", "email", "studentNumber", "applicationNumber", "courseOfInterest"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
  };
  const [students, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      select: { id: true, fullName: true, email: true, applicationNumber: true, studentNumber: true, courseOfInterest: true, admittedAt: true, applicant: { select: { portalUsername: true, isActive: true } } },
      orderBy: [{ admittedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25
    }),
    prisma.application.count({ where })
  ]);
  res.set("Cache-Control", "no-store");
  ok(res, { students, total, page });
}));

export default router;
