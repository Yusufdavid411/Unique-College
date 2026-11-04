import { prisma } from "../config/prisma.js";
import { feeVerified } from "./paymentEligibility.js";

export function formAccessFor(application) {
  const fee = application.formFeeAmount;
  const unlocked = fee == null || feeVerified(application, "APPLICATION_FEE", fee);
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
