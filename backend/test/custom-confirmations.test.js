import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

test("application-owned confirmations use the branded provider, never browser message boxes", async () => {
  const root = new URL("../../frontend/src/", import.meta.url);
  const entries = await readdir(root, { recursive: true });
  for (const entry of entries.filter((name) => /\.(jsx|js)$/.test(name))) {
    const source = await readFile(new URL(entry.replaceAll("\\", "/"), root), "utf8");
    assert.doesNotMatch(source, /(?:window|globalThis)\.(?:alert|confirm|prompt)\s*\(/, entry);
  }
  const main = await readFile(new URL("main.jsx", root), "utf8");
  assert.match(main, /<ConfirmationProvider>/);
});
