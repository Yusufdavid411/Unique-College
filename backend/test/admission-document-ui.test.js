import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("document groups keep heading rules without individual row dividers", async () => {
  const css = await readFile(new URL("../../frontend/src/styles/global.css", import.meta.url), "utf8");
  const heading = css.match(/\.record-download-group h3\s*\{([^}]+)\}/)[1];
  const row = css.match(/\.record-download-group li\s*\{([^}]+)\}/)[1];
  assert.match(heading, /border-bottom: 1px solid/);
  assert.doesNotMatch(row, /border/);
});

test("admin admission no longer requires a separate letter-release panel", async () => {
  const review = await readFile(new URL("../../frontend/src/components/ScreeningReview.jsx", import.meta.url), "utf8");
  const applications = await readFile(new URL("../../frontend/src/pages/admin/AdminApplications.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(review + applications, /Open admission letter release|Release admission letter|letterPanel/);
  assert.match(applications, /Admit & release letter/);
  const downloads = await readFile(new URL("../../frontend/src/components/ApplicationDownloads.jsx", import.meta.url), "utf8");
  assert.match(downloads, /ACCEPTANCE: "Acceptance form"/);
  assert.match(downloads, /form.status === "SUBMITTED"/);
});
