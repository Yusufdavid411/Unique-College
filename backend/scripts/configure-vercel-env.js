import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const backend = fileURLToPath(new URL("../", import.meta.url));
const cliPath = process.argv[2];
if (!cliPath || !path.isAbsolute(cliPath)) throw new Error("Pass the absolute path of the installed Vercel CLI JavaScript entry.");
const project = JSON.parse(await fs.readFile(path.join(backend, ".vercel/project.json"), "utf8"));
if (project.projectId !== "prj_Qf2hwax1Tx87MDP6XoSOA0hCVPKb") throw new Error("Unexpected Vercel project. Verify the API project link before configuring deployment.");
const secrets = dotenv.parse(await fs.readFile(path.join(backend, ".env.bootstrap.local")));
const values = {
  JWT_SECRET: secrets.JWT_SECRET,
  ADMIN_PASSWORD: secrets.ADMIN_PASSWORD,
  ADMIN_EMAIL: secrets.ADMIN_EMAIL,
  NODE_ENV: "production",
  STORAGE_PROVIDER: "blob",
  CLIENT_URL: "https://uniquecollegekwali.vercel.app,https://uniquecollegekwali.edu.ng,https://www.uniquecollegekwali.edu.ng,https://admin.uniquecollegekwali.edu.ng",
  PUBLIC_BASE_URL: "https://unique-college-api-yusufdavid411s-projects.vercel.app"
};
for (const [key, value] of Object.entries(values)) {
  if (!value) throw new Error("Missing value for " + key);
  const result = spawnSync(process.execPath, [cliPath, "env", "add", key, "production", "--cwd", backend, "--scope", "yusufdavid411s-projects", "--yes", ["JWT_SECRET", "ADMIN_PASSWORD"].includes(key) ? "--sensitive" : "--no-sensitive"], { input: value, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("Unable to configure " + key + ". Inspect the deployment environment metadata; no secret values have been printed.");
  console.log("Configured " + key);
}
