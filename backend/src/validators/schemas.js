import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));
const optionalDate = z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").optional();
const publicationBoolean = z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]);

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(6)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const applicantLoginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(3),
    password: z.string().min(8)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const applicantRegisterSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(3),
    email: z.string().trim().email(),
    phoneNumber: z.string().trim().min(7),
    password: z.string().min(8).regex(/[A-Z]/, "Password must contain an uppercase letter").regex(/[0-9]/, "Password must contain a number")
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const educationRecordSchema = z.object({
  subject: z.string().trim(),
  grade: z.string().trim(),
  examBody: z.string().trim(),
  year: z.string().trim()
});

const workExperienceSchema = z.object({
  organization: z.string().trim(),
  date: z.string().trim().optional().or(z.literal("")),
  reasonForLeaving: z.string().trim().optional().or(z.literal(""))
});

export const applicantApplicationSchema = z.object({
  body: z.object({
    surname: optionalString,
    firstName: optionalString,
    middleName: optionalString,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dateOfBirth: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").optional(),
    lga: optionalString,
    state: optionalString,
    nationality: optionalString,
    maritalStatus: optionalString,
    postalAddress: optionalString,
    permanentAddress: optionalString,
    guardianName: optionalString,
    guardianAddress: optionalString,
    guardianRelationship: optionalString,
    guardianPhone: optionalString,
    courseOfInterest: optionalString,
    previousQualification: optionalString,
    educationRecords: z.array(educationRecordSchema).max(9).optional(),
    sponsorName: optionalString,
    sponsorAddress: optionalString,
    sponsorPhone: optionalString,
    workExperience: z.array(workExperienceSchema).max(4).optional(),
    declarationAccepted: z.boolean().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const applicantDocumentSchema = z.object({
  body: z.object({
    type: z.enum(["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT", "CHANGE_OF_NAME", "PAYMENT_EVIDENCE", "OTHER"]),
    label: z.string().trim().min(2)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const applicantPaymentSchema = z.object({
  body: z.object({
    type: z.enum(["APPLICATION_FEE", "ACCEPTANCE_FEE", "SCHOOL_FEE", "OTHER"]),
    amount: z.coerce.number().positive().max(10000000).multipleOf(0.01),
    reference: z.string().trim().min(3),
    paidAt: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").optional().or(z.literal(""))
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const paymentReviewSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
    reviewNote: optionalString
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid(), paymentId: z.string().uuid() })
});

export const documentReviewSchema = z.object({
  body: z.object({
    reviewStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
    reviewNote: optionalString
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid(), documentId: z.string().uuid() })
});

export const applicationSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2),
    email: z.string().trim().email(),
    phoneNumber: z.string().trim().min(7),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    dateOfBirth: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
    address: z.string().trim().min(5),
    state: z.string().trim().min(2),
    courseOfInterest: z.string().trim().min(2),
    previousQualification: optionalString
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: optionalString,
    subject: z.string().trim().min(2),
    message: z.string().trim().min(10)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const newsSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3),
    excerpt: z.string().trim().min(10),
    content: z.string().trim().min(20),
    isPublished: publicationBoolean.optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const gallerySchema = z.object({
  body: z.object({
    title: z.string().trim().min(2),
    category: z.string().trim().min(2),
    description: optionalString,
    isPublished: publicationBoolean.optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum(["DRAFT", "PENDING", "SUBMITTED", "REVIEWED", "RETURNED", "INTERVIEW_SCHEDULED", "ACCEPTED", "ADMITTED", "REJECTED"]),
    reviewNote: optionalString,
    interviewDate: optionalDate,
    entranceExamScore: z.coerce.number().min(0).max(100).optional(),
    interviewScore: z.coerce.number().min(0).max(100).optional(),
    dateResumed: optionalDate
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() })
});

export const idParamSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() })
});
