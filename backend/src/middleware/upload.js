import path from "node:path";
import multer from "multer";
import { uploadFolders } from "../config/uploads.js";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function storageFor(folderName) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolders[folderName]),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
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
  return multer({
    storage: storageFor(folderName),
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
  });
}

export function publicUploadPath(folderName, file) {
  if (!file) return null;
  return `/uploads/${folderName}/${file.filename}`;
}
