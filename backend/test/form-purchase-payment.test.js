import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import { uploadRoot } from "../src/config/uploads.js";
import { resolveUploadPath } from "../src/services/fileAccess.js";
import { applicantPaymentSchema } from "../src/validators/schemas.js";

test("form purchase needs no typed reference and rejects other payment categories", () => {
  const parse = (body) => applicantPaymentSchema.parse({ body, query: {}, params: {} }).body;
  assert.equal(parse({ amount: "20000" }).type, "APPLICATION_FEE");
  assert.equal(Object.hasOwn(parse({ amount: "20000", reference: "untrusted-reference" }), "reference"), false);
  for (const type of ["ACCEPTANCE_FEE", "SCHOOL_FEE", "OTHER"]) assert.throws(() => parse({ amount: "20000", type }));
});

test("receipt upload generates an internal tracking ID without a bank reference", async () => {
  const originals = { user: prisma.user.findUnique, application: prisma.application.findUnique, pending: prisma.payment.findFirst, transaction: prisma.$transaction };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api/applicant/payments";
  const headers = { Authorization: "Bearer " + jwt.sign({ sub: "receipt-owner", version: 0 }, env.jwtSecret) };
  let proofPath;
  try {
    prisma.user.findUnique = async () => ({ id: "receipt-owner", role: "APPLICANT", isActive: true, sessionVersion: 0 });
    prisma.application.findUnique = async () => ({ id: "application", status: "DRAFT", formFeeAmount: "20000", payments: [] });
    prisma.payment.findFirst = async () => null;
    prisma.$transaction = async (callback, options) => {
      assert.equal(options.isolationLevel, "Serializable");
      return callback({ payment: {
        findFirst: async () => null,
        create: async ({ data }) => {
          proofPath = data.proofPath;
          return { id: "receipt", status: "PENDING", currency: "NGN", ...data };
        }
      } });
    };
    const upload = new FormData();
    upload.set("amount", "20000");
    upload.set("proof", new Blob(["%PDF-1.7\nFictional receipt"], { type: "application/pdf" }), "receipt.pdf");
    const response = await fetch(base, { method: "POST", headers, body: upload });
    assert.equal(response.status, 201);
    const payment = (await response.json()).data;
    assert.equal(payment.type, "APPLICATION_FEE");
    assert.equal(payment.status, "PENDING");
    assert.match(payment.reference, /^FORM-[0-9a-f-]{36}$/);
    for (const type of ["SCHOOL_FEE", "ACCEPTANCE_FEE", "OTHER"]) {
      const rejected = await fetch(base, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ type, amount: 20000 }) });
      assert.equal(rejected.status, 422);
    }
  } finally {
    prisma.user.findUnique = originals.user;
    prisma.application.findUnique = originals.application;
    prisma.payment.findFirst = originals.pending;
    prisma.$transaction = originals.transaction;
    if (proofPath) {
      const local = resolveUploadPath(uploadRoot, proofPath);
      if (local) await fs.unlink(local);
    }
    await new Promise((resolve) => server.close(resolve));
  }
});
