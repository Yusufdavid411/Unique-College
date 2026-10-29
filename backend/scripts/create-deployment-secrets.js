import fs from "node:fs/promises";
import crypto from "node:crypto";

const destination = new URL("../.env.bootstrap.local", import.meta.url);
const content = [
  "JWT_SECRET=" + crypto.randomBytes(48).toString("base64url"),
  "PREVIEW_JWT_SECRET=" + crypto.randomBytes(48).toString("base64url"),
  "ADMIN_PASSWORD=Uc!" + crypto.randomBytes(24).toString("base64url") + "7",
  "ADMIN_EMAIL=admin@uniquecollegekwali.com"
].join("\n") + "\n";
try {
  await fs.writeFile(destination, content, { flag: "wx", mode: 0o600 });
  console.log("Created backend/.env.bootstrap.local. Keep this file private and excluded from source control.");
} catch (error) {
  console.error(error.code === "EEXIST" ? "Bootstrap secrets already exist; no secrets were replaced." : "Unable to create bootstrap secrets.");
  process.exitCode = 1;
}
