import "dotenv/config";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const connection = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!connection) {
  console.error("Set DIRECT_URL or DATABASE_URL before running Prisma migrations.");
  process.exit(1);
}
const cli = path.join(path.dirname(require.resolve("prisma/package.json")), "build/index.js");
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  env: { ...process.env, DATABASE_URL: connection }, stdio: "inherit", windowsHide: true
});
child.on("error", () => { console.error("Unable to start the installed Prisma CLI."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
