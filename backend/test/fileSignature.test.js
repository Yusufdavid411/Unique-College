import test from "node:test";
import assert from "node:assert/strict";
import { matchesFileSignature } from "../src/services/fileSignature.js";

test("upload signatures reject disguised content and accept supported headers", () => {
  assert.equal(matchesFileSignature(Buffer.from("<html>malicious</html>"), "image/jpeg"), false);
  assert.equal(matchesFileSignature(Buffer.from("%PDF-1.7"), "application/pdf"), true);
  assert.equal(matchesFileSignature(Buffer.from([255, 216, 255, 224]), "image/jpeg"), true);
  assert.equal(matchesFileSignature(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(matchesFileSignature(Buffer.from("RIFF1234WEBP"), "image/webp"), true);
  assert.equal(matchesFileSignature(Buffer.from("RIFF1234WAVE"), "image/webp"), false);
});
