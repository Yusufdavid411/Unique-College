import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("portal screens avoid repeated test banners while preserving unavailable payment controls", async () => {
  const root = new URL("../../frontend/src/", import.meta.url);
  for (const path of ["components/ApplicantLayout.jsx", "components/FlutterwavePayment.jsx", "pages/admin/AdminApplications.jsx"]) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(source, /TEST ACCOUNT|TEST MODE|TEST RECORDS|TEST APPLICATION|Use sample information/);
  }
  const payment = await readFile(new URL("components/FlutterwavePayment.jsx", root), "utf8");
  assert.match(payment, /!paymentGateway\.ready/);
  assert.match(payment, /temporarily unavailable for this account/);
  const records = await readFile(new URL("../src/services/applicationPdf.js", import.meta.url), "utf8");
  assert.match(records, /TEST PAYMENT - NO REAL MONEY - NOT VALID FOR ADMISSION/);
  assert.match(records, /if \(payment\.isTest\)/);
});
