import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(6)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
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
    previousQualification: z.string().trim().min(2)
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
    imagePath: optionalString,
    isPublished: z.coerce.boolean().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const gallerySchema = z.object({
  body: z.object({
    title: z.string().trim().min(2),
    category: z.string().trim().min(2),
    description: optionalString,
    isPublished: z.coerce.boolean().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"]),
    reviewNote: optionalString
  }),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() })
});

export const idParamSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({ id: z.string().uuid() })
});
