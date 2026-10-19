import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveUploadPath, canReadApplicantFile } from "../src/services/fileAccess.js";

test("file resolution rejects traversal, absolute paths, and executable extensions", () => {
  for (const unsafe of ["/uploads/documents/../secret.pdf", "/uploads/documents/%2e%2e/secret.pdf", "C:/secret.pdf", "/uploads/documents/image.html", "/uploads/documents/nested/file.pdf", ["/uploads/documents/file.pdf"]]) {
    assert.equal(resolveUploadPath("uploads", unsafe), null);
  }
  assert.equal(resolveUploadPath("uploads", "/uploads/documents/proof-123.pdf"), path.resolve("uploads/documents/proof-123.pdf"));
});

test("only the active owner or authorised reviewer can read applicant files", () => {
  const owner = { id: "owner", isActive: true };
  assert.equal(canReadApplicantFile(owner, "owner"), true);
  assert.equal(canReadApplicantFile(owner, "other"), false);
  assert.equal(canReadApplicantFile(owner, "other", ["content.manage"]), false);
  assert.equal(canReadApplicantFile(owner, "other", ["applications.read"]), true);
  assert.equal(canReadApplicantFile({ ...owner, isActive: false }, "owner", ["applications.read"]), false);
});
