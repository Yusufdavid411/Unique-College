import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export function formAccessFor(application) {
  const fee = application.formFeeAmount;
  const unlocked = fee == null || new Prisma.Decimal(fee).equals(0) || (application.payments || []).some((payment) => Boolean(payment.isTest) === Boolean(application.isTest) && payment.type === "APPLICATION_FEE" && payment.status === "VERIFIED" && payment.currency === "NGN" && new Prisma.Decimal(payment.amount).equals(fee));
  return { unlocked, amount: fee == null ? null : String(fee), currency: "NGN" };
}

export async function requireFormAccess(req, res, next) {
  try {
    const application = await prisma.application.findUnique({ where: { applicantId: req.user.id }, include: { payments: true } });
    if (!application) return res.status(404).json({ success: false, message: "Applicant record not found" });
    if (!formAccessFor(application).unlocked) return res.status(402).json({ success: false, code: "FORM_PAYMENT_REQUIRED", message: "Your application form unlocks after the application fee is verified" });
    next();
  } catch (error) { next(error); }
}
