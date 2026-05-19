import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createContactMessage = asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.create({ data: req.body });
  created(res, message, "Message received");
});

export const listContactMessages = asyncHandler(async (req, res) => {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  ok(res, messages);
});

export const markContactRead = asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.update({
    where: { id: req.params.id },
    data: { isRead: true }
  });
  ok(res, message, "Message marked as read");
});
