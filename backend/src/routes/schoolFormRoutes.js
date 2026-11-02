import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { schoolFormFields, validateSchoolForm, schoolFormAllowed } from "../services/schoolForms.js";
import { documentsPolicy } from "../services/admissionDocuments.js";
import { schoolFormPdf } from "../services/schoolDocumentsPdf.js";
const router = Router();
router.use(requireAuth, requireRole("APPLICANT", "STUDENT"), (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/:kind", asyncHandler(async (req, res) => {
  const kind = z.enum(["ACCEPTANCE", "GUARANTOR", "STUDENT_RECORD"]).parse(req.params.kind);
  const application = await prisma.application.findUnique({ where: { applicantId: req.user.id }, include: { payments: true } });
  if (!application || !schoolFormAllowed(application, req.user, kind)) return res.status(403).json({ message: "This form is available after its required admission and payment steps." });
  const record = await prisma.schoolForm.findUnique({ where: { applicationId_kind: { applicationId: application.id, kind } } });
  const defaults = kind === "ACCEPTANCE" ? { contactAddress: application.postalAddress || application.address || "" } : kind === "STUDENT_RECORD" ? { state: application.state || "", lga: application.lga || "", maritalStatus: application.maritalStatus || "", sponsorName: application.sponsorName || "", sponsorResidentialAddress: application.sponsorAddress || "", sponsorMobile: application.sponsorPhone || "", permanentAddress: application.permanentAddress || application.address || "" } : {};
  ok(res, { record, defaults, fields: schoolFormFields[kind], applicationId: application.id });
}));
router.put("/:kind", asyncHandler(async (req, res) => {
  const kind = z.enum(["ACCEPTANCE", "GUARANTOR", "STUDENT_RECORD"]).parse(req.params.kind);
  const input = z.object({ data: z.record(z.union([z.string(), z.boolean()])), submit: z.boolean(), version: z.string().datetime().nullable() }).strict().parse(req.body);
  const data = validateSchoolForm(kind, input.data, input.submit);
  const result = await prisma.$transaction(async (database) => {
    const application = await database.application.findUnique({ where: { applicantId: req.user.id }, include: { payments: true, admissionLetters: { orderBy: { version: "desc" }, take: 1 }, studentProfile: { include: { enrolments: { orderBy: { createdAt: "desc" }, take: 1, include: { programme: { include: { department: true } } } } } } } });
    if (!application || !schoolFormAllowed(application, req.user, kind)) throw Object.assign(new Error("This form is not available for this admission step."), { statusCode: 403 });
    const current = await database.schoolForm.findUnique({ where: { applicationId_kind: { applicationId: application.id, kind } } });
    if (current?.status === "SUBMITTED") throw Object.assign(new Error("This submitted form is retained for review. Contact the registry to request corrections."), { statusCode: 409 });
    if ((current?.updatedAt.toISOString() || null) !== input.version) throw Object.assign(new Error("Your form changed. Refresh before saving again."), { statusCode: 409 });
    if (input.submit) {
      const details = { ...(application.admissionLetters[0]?.snapshot || { ...(await documentsPolicy(database)), programme: application.courseOfInterest }), department: application.studentProfile?.enrolments[0]?.programme.department.name };
      if (!details.session || kind === "GUARANTOR" && !details.department) throw Object.assign(new Error("The registry must configure the academic session and, for guarantors, assign your official department before submission. You can save a draft meanwhile."), { statusCode: 409 });
      await schoolFormPdf(application, { kind, data, submittedAt: new Date() }, details, application.studentProfile);
    }
    const result = await database.schoolForm.upsert({ where: { applicationId_kind: { applicationId: application.id, kind } }, update: { data, status: input.submit ? "SUBMITTED" : "DRAFT", submittedAt: input.submit ? new Date() : null }, create: { applicationId: application.id, kind, data, status: input.submit ? "SUBMITTED" : "DRAFT", submittedAt: input.submit ? new Date() : null } });
    await database.auditLog.create({ data: { actorId: req.user.id, action: `school_form.${input.submit ? "submitted" : "saved"}:${kind}`, targetType: "school_form", targetId: result.id } });
    return result;
  }, { isolationLevel: "Serializable", timeout: 15000 });
  ok(res, result, input.submit ? "Form submitted. Download the school copy and obtain the required handwritten signatures." : "Draft saved.");
}));
export default router;
