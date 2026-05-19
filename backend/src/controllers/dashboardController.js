import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardStats = asyncHandler(async (req, res) => {
  const [
    applications,
    pendingApplications,
    acceptedApplications,
    newsItems,
    galleryItems,
    unreadMessages
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.application.count({ where: { status: "ACCEPTED" } }),
    prisma.news.count(),
    prisma.gallery.count(),
    prisma.contactMessage.count({ where: { isRead: false } })
  ]);

  ok(res, {
    applications,
    pendingApplications,
    acceptedApplications,
    newsItems,
    galleryItems,
    unreadMessages
  });
});
