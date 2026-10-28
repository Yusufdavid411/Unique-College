import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

test("retired sandbox rejects registration, checkout and webhook requests without touching records", async () => {
  const previous = process.env.PAYMENT_SANDBOX_RETIRED;
  process.env.PAYMENT_SANDBOX_RETIRED = "true";
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    for (const path of ["/api/applicant/register", "/api/payments/flutterwave/checkout", "/api/payments/flutterwave/webhook"]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: "POST" });
      assert.equal(response.status, 410);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match((await response.json()).message, /retired/);
    }
  } finally {
    if (previous === undefined) delete process.env.PAYMENT_SANDBOX_RETIRED;
    else process.env.PAYMENT_SANDBOX_RETIRED = previous;
    await new Promise((resolve) => server.close(resolve));
  }
});
