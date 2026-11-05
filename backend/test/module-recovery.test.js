import test from "node:test";
import assert from "node:assert/strict";
import { isModuleLoadError, recoverModuleLoad, installModuleRecovery } from "../../frontend/src/api/moduleRecovery.js";

const failure = new TypeError("Failed to fetch dynamically imported module: https://portal.uniquecollegekwali.com/assets/old-page.js");
function fixture() {
  const values = new Map([["unique_college_student_token", "existing-session"]]);
  const runtime = { navigator: { onLine: true }, sessionStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) }, location: { reload: () => { runtime.reloads++; } }, reloads: 0 };
  return { runtime, values };
}

test("module failures refresh once without clearing sessions or repeatedly reloading", () => {
  const { runtime, values } = fixture();
  assert.equal(recoverModuleLoad(failure, runtime, 100000), true);
  assert.equal(recoverModuleLoad(failure, runtime, 100001), false);
  assert.equal(runtime.reloads, 1);
  assert.equal(values.get("unique_college_student_token"), "existing-session");
  assert.equal(recoverModuleLoad(failure, runtime, 160001), true);
});

test("offline users and unavailable storage never enter reload loops", () => {
  const { runtime } = fixture();
  runtime.navigator.onLine = false;
  assert.equal(recoverModuleLoad(failure, runtime), false);
  runtime.navigator.onLine = true;
  runtime.sessionStorage = { getItem: () => { throw new Error("Storage unavailable"); } };
  assert.equal(recoverModuleLoad(failure, runtime), false);
  assert.equal(runtime.reloads, 0);
});

test("ordinary runtime and API errors are not mistaken for deployment failures", () => {
  const { runtime } = fixture();
  for (const error of [new TypeError("Cannot read properties of null"), new Error("Network Error"), undefined]) {
    assert.equal(isModuleLoadError(error), false);
    assert.equal(recoverModuleLoad(error, runtime), false);
  }
  for (const error of [{ name: "ChunkLoadError" }, new Error("Importing a module script failed."), new Error("Unable to preload CSS for /assets/old.css")]) assert.equal(isModuleLoadError(error), true);
  assert.equal(runtime.reloads, 0);
});

test("Vite preload failures are intercepted only when recovery actually starts", () => {
  const { runtime } = fixture();
  let listener;
  let prevented = false;
  runtime.addEventListener = (name, callback) => { assert.equal(name, "vite:preloadError"); listener = callback; };
  runtime.removeEventListener = (name, callback) => { assert.equal(callback, listener); };
  const uninstall = installModuleRecovery(runtime);
  listener({ payload: failure, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(runtime.reloads, 1);
  uninstall();
});
