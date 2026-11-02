import { z } from "zod";
import { admissionProgressFor } from "./acceptance.js";

export const schoolFormFields = {
  ACCEPTANCE: [["contactAddress", "Contact address", true], ["declaration", "Confirm the information is correct", true, "checkbox"]],
  GUARANTOR: [["guarantorName", "Guarantor's full name", true], ["guarantorCapacity", "Guarantor description (I/We)", false], ["guarantorAddress", "Guarantor's business/office address", true], ["relationship", "Relationship to student", true], ["undertakingName", "Name making the undertaking", true], ["signedDay", "Day of signing", false], ["signedMonth", "Month of signing", false], ["signedYear", "Year of signing", false], ["presenceOf", "Person present", false], ["witnessName", "Witness's name", true], ["witnessAddress", "Witness's address", true], ["declaration", "Confirm these details are accurate; signatures will be completed by the actual signatories", true, "checkbox"]],
  STUDENT_RECORD: [["state", "State of origin", true], ["lga", "Local government area", true], ["tribe", "Tribe (optional)", false], ["placeOfBirth", "Place of birth", true], ["maritalStatus", "Marital status", true], ["fatherName", "Father's name", false], ["fatherOfficeAddress", "Father's office address", false], ["fatherResidentialAddress", "Father's residential address", false], ["fatherEmail", "Father's email", false, "email"], ["fatherOfficePhone", "Father's office phone", false], ["fatherMobile", "Father's mobile phone", false], ["sponsorName", "Sponsor's full name", true], ["sponsorOfficeAddress", "Sponsor's office address", false], ["sponsorResidentialAddress", "Sponsor's residential address", true], ["sponsorEmail", "Sponsor's email", false, "email"], ["sponsorOfficePhone", "Sponsor's office phone", false], ["sponsorMobile", "Sponsor's mobile phone", true], ["permanentAddress", "Permanent home address", true], ["declaration", "Confirm the details are accurate", true, "checkbox"]]
};

export function validateSchoolForm(kind, values, submit) {
  const shape = Object.fromEntries(schoolFormFields[kind].map(([key, , required, type]) => [key, type === "checkbox" ? (submit && required ? z.literal(true) : z.boolean().optional()) : (submit && required ? z.string().trim().min(1).max(key.toLowerCase().includes("address") ? 300 : 100) : z.string().trim().max(key.toLowerCase().includes("address") ? 300 : 100).optional()).refine((value) => type !== "email" || !value || z.string().email().safeParse(value).success, "Enter a valid email")]));
  return z.object(shape).strict().parse(values);
}

export function schoolFormAllowed(application, user, kind) {
  if (kind === "ACCEPTANCE") return ["ACCEPTED", "ADMITTED"].includes(application.status) && application.offerResponse === "ACCEPTED" && admissionProgressFor(application).paid;
  return application.status === "ADMITTED" && user.role === "STUDENT";
}
