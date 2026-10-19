import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { put, get } from "@vercel/blob";
import { uploadRoot } from "../config/uploads.js";
import { resolveUploadPath } from "./fileAccess.js";

const contentTypes = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const provider = process.env.STORAGE_PROVIDER || "local";
if (!["local", "s3", "blob"].includes(provider)) throw new Error("Unsupported STORAGE_PROVIDER");
let client;
function s3Client() {
  if (!process.env.S3_BUCKET) throw new Error("S3_BUCKET is required for object storage");
  if (!client) client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? { credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } } : {})
  });
  return client;
}

export async function persistUpload(file, folder) {
  if (provider === "local") return;
  if (provider === "blob") {
    await put(folder + "/" + file.filename, createReadStream(file.path), { access: "private", addRandomSuffix: false, contentType: file.mimetype });
    await fs.unlink(file.path);
    return;
  }
  await s3Client().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: folder + "/" + file.filename,
    Body: createReadStream(file.path),
    ContentLength: file.size,
    ContentType: file.mimetype
  }));
  await fs.unlink(file.path);
}

export async function sendStoredFile(storedPath, res, download = false) {
  const localPath = resolveUploadPath(uploadRoot, storedPath);
  if (!localPath) return res.sendStatus(404);
  res.set("Content-Type", contentTypes[path.extname(localPath)] || "application/octet-stream");
  if (download) res.attachment(path.basename(localPath));
  if (provider === "local") {
    await fs.access(localPath);
    await pipeline(createReadStream(localPath), res);
    return;
  }
  if (provider === "blob") {
    const result = await get(storedPath.slice("/uploads/".length), { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return res.sendStatus(404);
    await pipeline(result.stream, res);
    return;
  }
  const result = await s3Client().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: storedPath.slice("/uploads/".length) }));
  await pipeline(result.Body, res);
}
