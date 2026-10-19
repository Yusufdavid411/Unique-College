import "dotenv/config";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawn } from "node:child_process";
import { uploadRoot } from "../src/config/uploads.js";

async function checksum(filename) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

async function runDump(destination) {
  const connection = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!connection) throw new Error("Set DIRECT_URL to the direct PostgreSQL connection for backups.");
  const databaseUrl = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) throw new Error("A PostgreSQL connection is required.");
  const databaseEnv = {
    ...process.env,
    PGHOST: databaseUrl.hostname,
    PGPORT: databaseUrl.port || "5432",
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGSSLMODE: databaseUrl.searchParams.get("sslmode") || "require",
    PGCONNECT_TIMEOUT: "15"
  };
  await new Promise((resolve, reject) => {
    const child = spawn(process.env.PG_DUMP_PATH || "pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--no-password", "--file", destination], { env: databaseEnv, stdio: "ignore", windowsHide: true });
    child.on("error", () => reject(new Error("Unable to start pg_dump. Install PostgreSQL client tools or set PG_DUMP_PATH.")));
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error("pg_dump failed. Check database access, TLS, and client/server version compatibility.")));
  });
}

async function copyUploads(source, destination, prefix = "") {
  const files = [];
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const relative = prefix ? prefix + "/" + entry.name : entry.name;
    const original = path.join(source, entry.name);
    const copied = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Backup stopped: symbolic links are not supported in uploads.");
    if (entry.isDirectory()) files.push(...await copyUploads(original, copied, relative));
    else if (entry.isFile()) {
      await fs.copyFile(original, copied);
      const originalHash = await checksum(original);
      const copiedHash = await checksum(copied);
      if (originalHash !== copiedHash) throw new Error("Upload changed during backup. Retry with writes paused.");
      files.push({ path: "uploads/" + relative, sha256: copiedHash, bytes: (await fs.stat(copied)).size });
    }
  }
  return files;
}

try {
  if (["s3", "blob"].includes(process.env.STORAGE_PROVIDER)) throw new Error("Export object storage separately and pair it with a PostgreSQL backup. This command backs up local upload volumes only.");
  if (!process.argv[2]) throw new Error("Usage: npm run backup -- <new-backup-directory>. Pause application writes before starting.");
  const destination = path.resolve(process.argv[2]);
  const source = await fs.realpath(uploadRoot);
  const parent = await fs.realpath(path.dirname(destination));
  const actualDestination = path.join(parent, path.basename(destination));
  if (actualDestination === source || actualDestination.startsWith(source + path.sep)) throw new Error("Backup directory must be outside upload storage.");
  await fs.mkdir(actualDestination, { mode: 0o700 });
  const dumpPath = path.join(actualDestination, "database.dump");
  await runDump(dumpPath);
  const uploads = await copyUploads(source, path.join(actualDestination, "uploads"));
  await fs.writeFile(path.join(actualDestination, "manifest.json"), JSON.stringify({ format: 1, createdAt: new Date().toISOString(), database: { path: "database.dump", sha256: await checksum(dumpPath), bytes: (await fs.stat(dumpPath)).size }, files: uploads }, null, 2), { flag: "wx", mode: 0o600 });
  console.log("Backup completed with SHA-256 file manifest. Test restoration in an isolated database before relying on it.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Backup failed.");
  process.exitCode = 1;
}
