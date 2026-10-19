import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { uploadFolders } from "../src/config/uploads.js";

test("private file is hidden publicly, denied to other applicants, and downloadable by its owner", async () => {
  const filename = crypto.randomUUID() + ".pdf";
  const storedPath = "/uploads/documents/" + filename;
  await fs.mkdir(uploadFolders.documents, { recursive: true });
  await fs.writeFile(path.join(uploadFolders.documents, filename), "%PDF-test-private");
  const originals = { user: prisma.user.findUnique, news: prisma.news.findFirst, gallery: prisma.gallery.findFirst, application: prisma.application.findFirst };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  let userId = "other-applicant";
  prisma.user.findUnique = async () => ({ id: userId, role: "APPLICANT", isActive: true, sessionVersion: 0 });
  prisma.news.findFirst = async () => null;
  prisma.gallery.findFirst = async () => null;
  prisma.application.findFirst = async () => ({ applicantId: "owner" });
  const headers = { Authorization: "Bearer " + jwt.sign({ sub: "test-user", version: 0 }, env.jwtSecret) };
  try {
    assert.equal((await fetch(base + storedPath)).status, 404);
    assert.equal((await fetch(base + "/api/files?path=" + encodeURIComponent(storedPath))).status, 401);
    assert.equal((await fetch(base + "/api/files?path=" + encodeURIComponent(storedPath), { headers })).status, 404);
    userId = "owner";
    const download = await fetch(base + "/api/files?path=" + encodeURIComponent(storedPath), { headers });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("cache-control"), "private, no-store");
    assert.equal(await download.text(), "%PDF-test-private");
  } finally {
    prisma.user.findUnique = originals.user;
    prisma.news.findFirst = originals.news;
    prisma.gallery.findFirst = originals.gallery;
    prisma.application.findFirst = originals.application;
    await fs.unlink(path.join(uploadFolders.documents, filename));
    await new Promise((resolve) => server.close(resolve));
  }
});
