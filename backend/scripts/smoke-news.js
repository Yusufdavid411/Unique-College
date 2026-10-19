import fs from "node:fs/promises";
import dotenv from "dotenv";
import assert from "node:assert/strict";

const base = process.argv[2]?.replace(/\/$/, "");
if (!base?.startsWith("https://")) throw new Error("Pass the HTTPS origin of the deployed Unique College API.");
const secrets = dotenv.parse(await fs.readFile(new URL("../.env.bootstrap.local", import.meta.url)));
let token;
let createdId;
async function request(route, options = {}) {
  const response = await fetch(base + "/api" + route, {
    ...options,
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers },
    signal: AbortSignal.timeout(45000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(route + " failed with HTTP " + response.status + ": " + (result.message || "Request failed"));
  return result.data;
}

try {
  await request("/health/db");
  console.log("Live database health verified.");
  const session = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: secrets.ADMIN_EMAIL, password: secrets.ADMIN_PASSWORD }) });
  token = session.token;
  assert.equal(session.user.role, "ADMIN");
  console.log("Administrator sign-in verified.");
  const data = new FormData();
  data.set("title", "Temporary website publishing verification");
  data.set("excerpt", "Temporary technical verification entry, not an institutional announcement.");
  data.set("content", "This temporary entry verifies the school's news publishing system. It will be removed automatically after the publishing and unpublishing checks complete.");
  data.set("isPublished", "true");
  const image = await fs.readFile(new URL("../../frontend/public/school-assets/logo-new.jpg", import.meta.url));
  data.set("image", new Blob([image], { type: "image/jpeg" }), "verification-logo.jpg");
  const news = await request("/news", { method: "POST", body: data });
  createdId = news.id;
  assert.ok((await request("/news/public")).some((item) => item.id === news.id));
  const publicImage = await fetch(base + news.imagePath, { signal: AbortSignal.timeout(45000) });
  assert.equal(publicImage.status, 200);
  assert.equal(publicImage.headers.get("content-type").includes("image/jpeg"), true);
  await publicImage.arrayBuffer();
  console.log("News upload, private object storage, public feed and public image verified.");
  const update = new FormData();
  for (const key of ["title", "excerpt", "content"]) update.set(key, news[key]);
  update.set("isPublished", "false");
  await request("/news/" + news.id, { method: "PUT", body: update });
  assert.equal((await request("/news/public")).some((item) => item.id === news.id), false);
  assert.equal((await fetch(base + news.imagePath)).status, 404);
  console.log("Unpublishing hides both the news entry and its image.");
  const draftPreview = await fetch(base + "/api/files?path=" + encodeURIComponent(news.imagePath), { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(45000) });
  assert.equal(draftPreview.status, 200);
  assert.equal(draftPreview.headers.get("content-type").includes("image/jpeg"), true);
  await draftPreview.arrayBuffer();
  console.log("Unpublished images remain available to authorised CMS reviewers only.");
} finally {
  if (createdId && token) {
    await request("/news/" + createdId, { method: "DELETE" });
    console.log("Temporary verification news entry removed.");
  }
}
