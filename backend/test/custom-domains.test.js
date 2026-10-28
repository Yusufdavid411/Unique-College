import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicPageHref, applicationHref, portalPath, portalScope } from "../../frontend/src/api/portalLinks.js";
import { sessionScope } from "../../frontend/src/api/session.js";

test("only legacy portal prefixes redirect, never the hostname roots", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config.redirects.map((rule) => [rule.source, rule.has[0].value, rule.destination]), [
    ["/admin/login", "admin.uniquecollegekwali.com", "/"],
    ["/admin/:path*", "admin.uniquecollegekwali.com", "/:path*"],
    ["/applicant/register", "apply.uniquecollegekwali.com", "/"],
    ["/applicant/:path*", "apply.uniquecollegekwali.com", "/:path*"]
  ]);
  assert.ok(config.redirects.every((rule) => rule.permanent === false));
});

test("school-domain links cross to the correct portal without changing local development", () => {
  assert.equal(applicationHref("www.uniquecollegekwali.com"), "https://apply.uniquecollegekwali.com/");
  assert.equal(publicPageHref("/news", "apply.uniquecollegekwali.com"), "https://www.uniquecollegekwali.com/news");
  assert.equal(applicationHref("localhost"), "/applicant/register");
  assert.equal(publicPageHref("/", "localhost"), "/");
  assert.equal(applicationHref("uniquecollegekwali.com.attacker.test"), "/applicant/register");
});

test("clean portal paths retain the correct authentication scope and local compatibility", () => {
  const admin = "admin.uniquecollegekwali.com";
  const applicant = "apply.uniquecollegekwali.com";
  assert.equal(portalPath("/admin", admin), "/");
  assert.equal(portalPath("/admin/login", admin), "/");
  assert.equal(portalPath("/admin/news", admin), "/news");
  assert.equal(portalPath("/applicant", applicant), "/");
  assert.equal(portalPath("/applicant/register", applicant), "/");
  assert.equal(portalPath("/applicant/login", applicant), "/login");
  assert.equal(portalPath("/applicant/payments", applicant), "/payments");
  assert.equal(portalPath("/admin/news", "localhost"), "/admin/news");
  assert.equal(portalPath("/administrator", admin), "/administrator");
  assert.equal(sessionScope("/", admin), "admin");
  assert.equal(sessionScope("/news", admin), "admin");
  assert.equal(sessionScope("/payments", applicant), "applicant");
  assert.equal(sessionScope("/news", "www.uniquecollegekwali.com"), null);
  assert.equal(sessionScope("/admin/news", "localhost"), "admin");
  assert.equal(portalScope("admin.uniquecollegekwali.com.attacker.test"), null);
});
