import { prisma } from "../config/prisma.js";
import { z } from "zod";

export const admissionsPolicyKey = "admissions_policy";
export const applicationClosingDateSchema = z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "Choose a valid application submission deadline");

export function parseAdmissionsPolicy(value) {
  if (!value) return { open: false, message: "Admissions dates will be announced shortly.", applicationFee: null, closingDate: "" };
  const policy = JSON.parse(value);
  return { open: policy.open === true, message: policy.message || "Admissions are currently closed.", applicationFee: typeof policy.applicationFee === "number" && Number.isFinite(policy.applicationFee) && policy.applicationFee >= 0 ? policy.applicationFee : null, closingDate: applicationClosingDateSchema.safeParse(policy.closingDate).success ? policy.closingDate : "" };
}

export async function getAdmissionsPolicy(database = prisma) {
  const setting = await database.siteSetting.findUnique({ where: { key: admissionsPolicyKey } });
  return parseAdmissionsPolicy(setting?.value);
}

export async function requireAdmissionsOpen(req, res, next) {
  try {
    const policy = await getAdmissionsPolicy();
    if (!policy.open) return res.status(409).json({ success: false, message: policy.message });
    if (policy.applicationFee === null) return res.status(409).json({ success: false, message: "The school is preparing the application fee. Please check back shortly." });
    req.admissionsPolicy = policy;
    next();
  } catch (error) {
    next(error);
  }
}
