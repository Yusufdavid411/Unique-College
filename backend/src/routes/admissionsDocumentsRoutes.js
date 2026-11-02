import { Router } from "express";
import { z } from "zod";
import fs from "node:fs/promises";
import { prisma } from "../config/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auditedMutation } from "../services/audit.js";
import { ok } from "../utils/apiResponse.js";
import { documentsPolicy, documentsPolicyKey, documentsPolicySchema, screeningPolicy, screeningPolicyKey } from "../services/admissionDocuments.js";
const router = Router();
router.use(requireAuth, requirePermission("settings.manage"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/", asyncHandler(async (req, res) => ok(res, { ...(await screeningPolicy(prisma)), documents: await documentsPolicy(prisma) })));
router.get("/fee-schedule", asyncHandler(async (req, res) => {
  res.type("application/pdf").attachment("school-fee-schedule-for-review.pdf").send(await fs.readFile(new URL("../../assets/school-fees.pdf", import.meta.url)));
}));
router.put("/", asyncHandler(async (req, res) => {
  const data = z.object({ amount: z.number().finite().min(0).max(10000000).multipleOf(0.01), documents: documentsPolicySchema }).strict().parse(req.body);
  await auditedMutation(prisma, { actorId: req.user.id, action: "admissions.documents_policy_updated", targetType: "setting", targetId: documentsPolicyKey }, async (database) => {
    for (const [key, value] of [[screeningPolicyKey, { amount: data.amount }], [documentsPolicyKey, data.documents]]) await database.siteSetting.upsert({ where: { key }, update: { value: JSON.stringify(value), group: "admissions" }, create: { key, value: JSON.stringify(value), group: "admissions" } });
  });
  ok(res, data, "Screening fee, messages and letter details saved. Existing quotes and issued letters remain unchanged.");
}));
export default router;
