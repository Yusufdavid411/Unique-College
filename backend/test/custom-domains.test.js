import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicPageHref, applicationHref, applicantLoginHref, canonicalPortalHref, portalPath, portalScope } from "../../frontend/src/api/portalLinks.js";
import { sessionScope } from "../../frontend/src/api/session.js";

test("generated admin access instructions use school subdomains", async () => {
  const script = await readFile(new URL("../scripts/create-admin-access.js", import.meta.url), "utf8");
  assert.ok(script.includes("Admin login: https://admin.uniquecollegekwali.com/"));
  assert.ok(script.includes("News management: https://admin.uniquecollegekwali.com/news"));
  assert.ok(script.includes("Public news: https://www.uniquecollegekwali.com/news"));
  assert.ok(!script.includes("vercel.app"));
});

test("only legacy portal prefixes redirect, never the hostname roots", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config.redirects.filter((rule) => ["admin.uniquecollegekwali.com", "apply.uniquecollegekwali.com"].includes(rule.has[0].value)).map((rule) => [rule.source, rule.has[0].value, rule.destination]), [
    ["/admin/login", "admin.uniquecollegekwali.com", "/"],
    ["/admin/:path*", "admin.uniquecollegekwali.com", "/:path*"],
    ["/applicant/register", "apply.uniquecollegekwali.com", "/"],
    ["/applicant/:path*", "apply.uniquecollegekwali.com", "/:path*"]
  ]);
  assert.ok(config.redirects.every((rule) => rule.permanent === false));
});

test("public legacy links have one canonical portal destination", async () => {
  const hostname = "www.uniquecollegekwali.com";
  for (const path of ["/apply", "/application", "/applicant", "/applicant/register"]) {
    assert.equal(canonicalPortalHref(path, hostname), "https://apply.uniquecollegekwali.com/");
  }
  assert.equal(applicantLoginHref(hostname), "https://apply.uniquecollegekwali.com/login");
  assert.equal(canonicalPortalHref("/applicant/payments", hostname), "https://apply.uniquecollegekwali.com/payments");
  assert.equal(canonicalPortalHref("/admin/news", hostname), "https://admin.uniquecollegekwali.com/news");
  assert.equal(canonicalPortalHref("/applicant/register", "uniquecollegekwali.vercel.app"), "https://apply.uniquecollegekwali.com/");
  assert.equal(canonicalPortalHref("/news", hostname), null);
  assert.equal(canonicalPortalHref("/applicant/register", "localhost"), null);
  assert.equal(canonicalPortalHref("/", "apply.uniquecollegekwali.com"), null);
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  for (const path of ["/apply", "/application", "/applicant/register"]) {
    assert.equal(config.redirects.find((rule) => rule.source === path && rule.has[0].value === hostname)?.destination, "https://apply.uniquecollegekwali.com/");
  }
});

test("public application buttons share a safe new-tab link rather than legacy local routes", async () => {
  for (const file of ["components/PublicLayout.jsx", "components/CourseCard.jsx", "pages/public/Home.jsx", "pages/public/Admission.jsx"]) {
    const source = await readFile(new URL(`../../frontend/src/${file}`, import.meta.url), "utf8");
    assert.ok(source.includes("<ApplyLink"), file);
    assert.doesNotMatch(source, /to="\/(?:apply|application|applicant(?:\/[^\"]*)?)"/, file);
  }
  const shared = await readFile(new URL("../../frontend/src/components/ApplyLink.jsx", import.meta.url), "utf8");
  assert.match(shared, /href=\{applicationHref\(\)\}/);
  assert.match(shared, /target="_blank"/);
  assert.match(shared, /rel="noopener noreferrer"/);
  assert.match(shared, /opens in a new tab/);
  const styles = await readFile(new URL("../../frontend/src/styles/global.css", import.meta.url), "utf8");
  assert.match(styles, /a\.application-link:hover\s*\{\s*transition: none;\s*transform: none;/);
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

test("retired payment sandbox no longer hosts applicant routes and points only to the live entry", () => {
  const hostname = "unique-college-payment-test.vercel.app";
  assert.equal(portalScope(hostname), null);
  assert.equal(applicationHref(hostname), "https://apply.uniquecollegekwali.com/");
  assert.equal(applicantLoginHref(hostname), "https://apply.uniquecollegekwali.com/login");
  assert.equal(canonicalPortalHref("/applicant/payments", hostname), "https://apply.uniquecollegekwali.com/");
  assert.equal(canonicalPortalHref("/", hostname), "https://apply.uniquecollegekwali.com/");
});

test("legacy website aliases canonicalize public pages as well as portal entry points", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  for (const hostname of ["uniquecollegekwali.vercel.app", "uniquecollegekwali-yusufdavid411s-projects.vercel.app"]) {
    assert.equal(canonicalPortalHref("/", hostname), "https://www.uniquecollegekwali.com/");
    assert.equal(canonicalPortalHref("/news", hostname), "https://www.uniquecollegekwali.com/news");
    assert.equal(canonicalPortalHref("/applicant/register", hostname), "https://apply.uniquecollegekwali.com/");
    assert.equal(canonicalPortalHref("/admin/login", hostname), "https://admin.uniquecollegekwali.com/");
    assert.equal(config.redirects.find((rule) => rule.source === "/" && rule.has[0].value === hostname)?.destination, "https://www.uniquecollegekwali.com/");
  }
});
