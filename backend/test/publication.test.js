import test from "node:test";
import assert from "node:assert/strict";
import { newsSchema, gallerySchema } from "../src/validators/schemas.js";

test("multipart false remains unpublished for news and gallery", () => {
  const news = { title: "School news", excerpt: "An unpublished school news draft", content: "This draft should never appear on the public website.", isPublished: "false" };
  assert.equal(newsSchema.parse({ body: news, params: {}, query: {} }).body.isPublished, false);
  assert.equal(gallerySchema.parse({ body: { title: "Test image", category: "Campus", isPublished: "false" }, params: {}, query: {} }).body.isPublished, false);
  assert.equal(newsSchema.parse({ body: { ...news, isPublished: "true" }, params: {}, query: {} }).body.isPublished, true);
});
