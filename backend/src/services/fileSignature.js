export function matchesFileSignature(bytes, mime) {
  if (mime === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (["image/jpeg", "image/jpg"].includes(mime)) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
}
