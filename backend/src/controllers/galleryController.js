import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileMetadata } from "../services/uploadService.js";

export const publicGallery = asyncHandler(async (req, res) => {
  const gallery = await prisma.gallery.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" }
  });
  ok(res, gallery);
});

export const listGallery = asyncHandler(async (req, res) => {
  const gallery = await prisma.gallery.findMany({ orderBy: { createdAt: "desc" } });
  ok(res, gallery);
});

export const createGalleryItem = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Image upload is required" });
  }

  const metadata = fileMetadata(req.file, "gallery");
  const item = await prisma.gallery.create({
    data: {
      title: req.body.title,
      category: req.body.category,
      description: req.body.description || null,
      isPublished: req.body.isPublished ?? true,
      imagePath: metadata.path,
      fileType: metadata.fileType,
      fileSize: metadata.fileSize,
      uploadedById: req.user.id
    }
  });

  created(res, item, "Gallery item created");
});

export const updateGalleryItem = asyncHandler(async (req, res) => {
  const metadata = fileMetadata(req.file, "gallery");
  const data = {
    title: req.body.title,
    category: req.body.category,
    description: req.body.description || null,
    isPublished: req.body.isPublished ?? true
  };

  if (metadata.path) {
    data.imagePath = metadata.path;
    data.fileType = metadata.fileType;
    data.fileSize = metadata.fileSize;
  }

  const item = await prisma.gallery.update({
    where: { id: req.params.id },
    data
  });

  ok(res, item, "Gallery item updated");
});

export const deleteGalleryItem = asyncHandler(async (req, res) => {
  await prisma.gallery.delete({ where: { id: req.params.id } });
  ok(res, null, "Gallery item deleted");
});
