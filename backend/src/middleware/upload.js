import crypto from "node:crypto";
import fs from "node:fs/promises";
import multer from "multer";
import { uploadFolders } from "../config/uploads.js";
import { persistUpload } from "../services/storage.js";
import { matchesFileSignature } from "../services/fileSignature.js";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const allowedDocumentTypes = [...allowedImageTypes, "application/pdf"];
const uploadLimit = process.env.VERCEL === "1" ? 4 * 1024 * 1024 : 10 * 1024 * 1024;

function storageFor(folderName) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdir(uploadFolders[folderName], { recursive: true }).then(() => cb(null, uploadFolders[folderName])).catch(cb);
    },
    filename: (req, file, cb) => {
      const extension = { "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" }[file.mimetype];
      const safeName = crypto.randomUUID() + extension;
      cb(null, safeName);
    }
  });
}

function imageFilter(req, file, cb) {
  if (!allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
  }
  cb(null, true);
}

export function imageUpload(folderName) {
  const upload = multer({
    storage: storageFor(folderName),
    fileFilter: imageFilter,
    limits: { fileSize: uploadLimit, files: 1, fields: 50, parts: 51 }
  });
  return validatedUpload(upload, folderName);
}

export function documentUpload(folderName = "documents") {
  const upload = multer({
    storage: storageFor(folderName),
    fileFilter(req, file, cb) {
      if (!allowedDocumentTypes.includes(file.mimetype)) {
        return cb(new Error("Only PDF, JPG, PNG, and WEBP files are allowed"));
      }
      cb(null, true);
    },
    limits: { fileSize: uploadLimit, files: 1, fields: 50, parts: 51 }
  });
  return validatedUpload(upload, folderName);
}

function validatedUpload(upload, folderName) {
  return { single(field) {
    return [upload.single(field), async (req, res, next) => {
      if (!req.file) return next();
      try {
        const handle = await fs.open(req.file.path, "r");
        const bytes = Buffer.alloc(16);
        try { await handle.read(bytes, 0, bytes.length, 0); } finally { await handle.close(); }
        if (!matchesFileSignature(bytes, req.file.mimetype)) {
          await fs.unlink(req.file.path);
          return res.status(422).json({ success: false, message: "File contents do not match the selected file type" });
        }
        await persistUpload(req.file, folderName);
        next();
      } catch (error) { next(error); }
    }];
  } };
}

export function publicUploadPath(folderName, file) {
  if (!file) return null;
  return `/uploads/${folderName}/${file.filename}`;
}
