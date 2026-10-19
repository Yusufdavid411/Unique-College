import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { admissionsPolicyKey, getAdmissionsPolicy } from "../services/admissionsPolicy.js";
import { z } from "zod";
import { auditedMutation } from "../services/audit.js";

export const readAdmissionsPolicy = asyncHandler(async (req, res) => {
  ok(res, await getAdmissionsPolicy());
});

export const saveAdmissionsPolicy = asyncHandler(async (req, res) => {
  const policy = z.object({ open: z.boolean(), message: z.string().trim().min(5).max(500) }).parse(req.body);
  await auditedMutation(prisma, { actorId: req.user.id, action: policy.open ? "admissions.opened" : "admissions.closed", targetType: "setting" }, (transaction) => transaction.siteSetting.upsert({
    where: { key: admissionsPolicyKey },
    update: { value: JSON.stringify(policy), group: "admissions" },
    create: { key: admissionsPolicyKey, value: JSON.stringify(policy), group: "admissions" }
  }));
  ok(res, policy, "Admissions availability updated");
});

export const listSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  ok(res, settings);
});

export const upsertSetting = asyncHandler(async (req, res) => {
  req.body = z.object({ key: z.string().trim().min(1).max(100), value: z.string().max(10000), group: z.string().trim().max(100).optional() }).parse(req.body);
  if (req.body.key === admissionsPolicyKey) return res.status(422).json({ success: false, message: "Use the admissions controls to update this setting" });
  const setting = await auditedMutation(prisma, { actorId: req.user.id, action: "setting.updated", targetType: "setting" }, (transaction) => transaction.siteSetting.upsert({
    where: { key: req.body.key },
    update: { value: req.body.value, group: req.body.group || "general" },
    create: { key: req.body.key, value: req.body.value, group: req.body.group || "general" }
  }));
  ok(res, setting, "Setting saved");
});
