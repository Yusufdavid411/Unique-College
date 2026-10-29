import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { PDFDocument } from "pdf-lib";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { applicationFormPdf, paymentReceiptPdf } from "../src/services/applicationPdf.js";

function fixture() {
  return {
    id: "application", applicantId: "owner", fullName: "Ọlá Test Applicant", applicationNumber: "UCHK-TEST",
    status: "ACCEPTED", submittedAt: new Date("2026-10-20"), formFeeAmount: "20000", gender: "MALE", dateOfBirth: new Date("2004-03-15"),
    maritalStatus: "SINGLE", courseOfInterest: "Community Health Extension Workers (CHEW) ND",
    educationRecords: ["English Language", "Mathematics", "Chemistry", "Physics", "Biology/Health Science", "Geography"].map((subject) => ({ subject, grade: "B3", examBody: "WAEC", year: "2024" })),
    payments: [{ id: "payment", type: "APPLICATION_FEE", currency: "NGN", amount: "20000", status: "VERIFIED", reference: "FORM-TEST", paidAt: new Date("2026-10-19"), verifiedAt: new Date("2026-10-20") }]
  };
}

test("original application template stays two pages and receipts are separate PDFs", async () => {
  const application = fixture();
  const form = await PDFDocument.load(await applicationFormPdf(application));
  assert.equal(form.getPageCount(), 2);
  assert.deepEqual(form.getPages().map((page) => page.getSize()), [{ width: 612, height: 792 }, { width: 612, height: 792 }]);
  const receipt = await PDFDocument.load(await paymentReceiptPdf(application, application.payments[0]));
  assert.equal(receipt.getPageCount(), 1);
  for (const status of ["PENDING", "REJECTED", "CANCELLED"]) await assert.rejects(paymentReceiptPdf(application, { ...application.payments[0], status }), (error) => error.statusCode === 409);
  await assert.rejects(applicationFormPdf({ ...application, fullName: "Overlong name ".repeat(100) }), (error) => error.statusCode === 422);
});

test("admin and applicant download identical forms while other accounts cannot read them", async () => {
  const original = { user: prisma.user.findUnique, application: prisma.application.findUnique };
  const application = fixture();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api/records/applications/application";
  async function call(suffix, userId) {
    return fetch(base + suffix, { headers: userId ? { Authorization: "Bearer " + jwt.sign({ sub: userId, version: 0 }, env.jwtSecret) } : {} });
  }
  try {
    prisma.application.findUnique = async () => application;
    prisma.user.findUnique = async ({ where }) => ({ id: where.id, role: where.id === "admin" ? "ADMIN" : "APPLICANT", isActive: true, sessionVersion: 0 });
    assert.equal((await call("/form")).status, 401);
    assert.equal((await call("/form", "other")).status, 404);
    assert.equal((await call("/payments/payment/receipt", "other")).status, 404);
    const applicant = await call("/form", "owner");
    const admin = await call("/form", "admin");
    assert.equal(applicant.status, 200);
    assert.equal(admin.status, 200);
    assert.equal(applicant.headers.get("content-type"), "application/pdf");
    assert.match(applicant.headers.get("content-disposition"), /attachment.*\.pdf/);
    assert.equal(applicant.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(Buffer.from(await applicant.arrayBuffer()), Buffer.from(await admin.arrayBuffer()));
    for (const user of ["owner", "admin"]) {
      const receipt = await call("/payments/payment/receipt", user);
      assert.equal(receipt.status, 200);
      assert.equal((await PDFDocument.load(await receipt.arrayBuffer())).getPageCount(), 1);
      for (const status of ["DRAFT", "SUBMITTED", "RETURNED", "REJECTED", "REVIEWED"]) {
        application.status = status;
        assert.equal((await call("/form", user)).status, 409);
        assert.equal((await call("/payments/payment/receipt", user)).status, 200);
      }
      application.status = "ACCEPTED";
    }
    application.payments[0].status = "PENDING";
    assert.equal((await call("/form", "owner")).status, 402);
    assert.equal((await call("/payments/payment/receipt", "owner")).status, 409);
    assert.equal((await call("/form", "admin")).status, 409);
    assert.equal((await call("/payments/missing/receipt", "admin")).status, 404);
  } finally {
    prisma.user.findUnique = original.user;
    prisma.application.findUnique = original.application;
    await new Promise((resolve) => server.close(resolve));
  }
});
