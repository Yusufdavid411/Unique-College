import { prisma } from "../config/prisma.js";

export const admissionsPolicyKey = "admissions_policy";

export function parseAdmissionsPolicy(value) {
  if (!value) return { open: false, message: "Admissions dates will be announced shortly." };
  const policy = JSON.parse(value);
  return { open: policy.open === true, message: policy.message || "Admissions are currently closed." };
}

export async function getAdmissionsPolicy() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: admissionsPolicyKey } });
  return parseAdmissionsPolicy(setting?.value);
}

export async function requireAdmissionsOpen(req, res, next) {
  try {
    const policy = await getAdmissionsPolicy();
    if (!policy.open) return res.status(409).json({ success: false, message: policy.message });
    next();
  } catch (error) {
    next(error);
  }
}
