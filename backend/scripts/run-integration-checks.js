import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("../", import.meta.url));
const direct = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED;
if (!direct || !process.env.NEON_PROJECT_ID) throw new Error("Load the dedicated Unique College Neon environment first.");
const database = new PrismaClient({ datasources: { db: { url: direct } } });
try {
  const existing = await database.$queryRaw`SELECT datname FROM pg_database WHERE datname = 'unique_college_test'`;
  if (!existing.length) await database.$executeRawUnsafe('CREATE DATABASE "unique_college_test"');
} finally { await database.$disconnect(); }
const testUrl = new URL(direct);
testUrl.pathname = "/unique_college_test";
const childEnv = {
  ...process.env, VERCEL: "0", NODE_ENV: "test", STORAGE_PROVIDER: "local",
  DATABASE_URL: testUrl.toString(), DATABASE_URL_UNPOOLED: testUrl.toString(), DIRECT_URL: testUrl.toString(),
  INTEGRATION_DATABASE_URL: testUrl.toString(), JWT_SECRET: crypto.randomBytes(48).toString("base64url"),
  UPLOAD_ROOT: path.join(os.tmpdir(), "unique-college-integration-uploads")
};
const migrations = spawnSync(process.execPath, [path.join(backend, "scripts/prisma-cli.js"), "migrate", "deploy"], { cwd: backend, env: childEnv, stdio: "inherit", windowsHide: true });
if (migrations.status !== 0) process.exit(migrations.status || 1);
const files = (await fs.readdir(path.join(backend, "test"))).filter((filename) => filename.endsWith(".test.js")).map((filename) => path.join(backend, "test", filename));
const tests = spawnSync(process.execPath, ["--test", ...files], { cwd: backend, env: childEnv, stdio: "inherit", windowsHide: true });
process.exitCode = tests.status ?? 1;
