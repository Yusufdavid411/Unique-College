import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

test("public admissions status reflects current stored policy without caching or assuming open", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const original = prisma.siteSetting.findUnique;
  try {
    for (const open of [true, false]) {
      prisma.siteSetting.findUnique = async () => ({ value: JSON.stringify({ open, message: open ? "Admissions ongoing" : "Admissions closed", applicationFee: 20000 }) });
      const response = await fetch(`${base}/settings/admissions`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).data.open, open);
    }
    const closedRegistration = await fetch(`${base}/applicant/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(closedRegistration.status, 409);
    prisma.siteSetting.findUnique = async () => null;
    assert.equal((await (await fetch(`${base}/settings/admissions`)).json()).data.open, false);
    prisma.siteSetting.findUnique = async () => { throw Object.assign(new Error("private connection details"), { code: "P1001" }); };
    const unavailable = await fetch(`${base}/settings/admissions`);
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.text()).includes("private connection details"), false);
  } finally {
    prisma.siteSetting.findUnique = original;
    await new Promise((resolve) => server.close(resolve));
  }
});
