import { prisma } from "../config/prisma.js";
import { created, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

async function uniqueSlug(title, existingId) {
  const base = slugify(title);
  let slug = base;
  let index = 1;

  while (await prisma.news.findFirst({ where: { slug, NOT: existingId ? { id: existingId } : undefined } })) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}

export const publicNews = asyncHandler(async (req, res) => {
  const news = await prisma.news.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" }
  });
  ok(res, news);
});

export const getPublicNewsBySlug = asyncHandler(async (req, res) => {
  const item = await prisma.news.findFirst({
    where: { slug: req.params.slug, isPublished: true }
  });
  if (!item) {
    return res.status(404).json({ success: false, message: "News item not found" });
  }
  ok(res, item);
});

export const listNews = asyncHandler(async (req, res) => {
  const news = await prisma.news.findMany({ orderBy: { createdAt: "desc" } });
  ok(res, news);
});

export const createNews = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(req.body.title);
  const news = await prisma.news.create({
    data: {
      ...req.body,
      slug,
      authorId: req.user.id
    }
  });
  created(res, news, "News item created");
});

export const updateNews = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(req.body.title, req.params.id);
  const news = await prisma.news.update({
    where: { id: req.params.id },
    data: { ...req.body, slug }
  });
  ok(res, news, "News item updated");
});

export const deleteNews = asyncHandler(async (req, res) => {
  await prisma.news.delete({ where: { id: req.params.id } });
  ok(res, null, "News item deleted");
});
