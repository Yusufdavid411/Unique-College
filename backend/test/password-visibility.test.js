import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const sourceRoot = new URL("../../frontend/src/", import.meta.url);

test("password controls start hidden and toggle without submitting the form", async () => {
  const component = await readFile(new URL("components/PasswordInput.jsx", sourceRoot), "utf8");
  assert.match(component, /useState\(false\)/);
  assert.match(component, /type=\{visible \? "text" : "password"\}/);
  assert.match(component, /type="button"/);
  assert.match(component, /setVisible\(\(current\) => !current\)/);
  assert.match(component, /aria-pressed=\{visible\}/);
  assert.match(component, /aria-controls=\{inputId\}/);
  assert.match(component, /visible \? "Hide" : "Show"/);
  assert.match(component, /<input \{\.\.\.props\}/);
});

test("all existing password forms use the shared visibility control", async () => {
  for (const path of ["pages/admin/AdminLogin.jsx", "pages/applicant/ApplicantAccess.jsx", "components/ChangePassword.jsx"]) {
    const source = await readFile(new URL(path, sourceRoot), "utf8");
    assert.ok(source.includes("<PasswordInput"), path);
    assert.ok(source.includes('autoComplete="current-password"') || source.includes('"current-password"'), path);
  }
  const changePassword = await readFile(new URL("components/ChangePassword.jsx", sourceRoot), "utf8");
  assert.equal((changePassword.match(/<PasswordInput/g) || []).length, 3);
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = new URL(entry.name, directory);
      if (entry.isDirectory()) await scan(new URL(`${entry.name}/`, directory));
      else if (/\.[jt]sx$/.test(entry.name) && entry.name !== "PasswordInput.jsx") {
        assert.doesNotMatch(await readFile(path, "utf8"), /type\s*=\s*["']password["']/, path.pathname);
      }
    }
  }
  await scan(sourceRoot);
});
