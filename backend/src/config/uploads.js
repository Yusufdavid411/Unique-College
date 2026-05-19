import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadRoot = path.resolve(__dirname, "../../uploads");

export const uploadFolders = {
  applications: path.join(uploadRoot, "applications"),
  gallery: path.join(uploadRoot, "gallery"),
  documents: path.join(uploadRoot, "documents"),
  profiles: path.join(uploadRoot, "profiles")
};

export function ensureUploadFolders() {
  Object.values(uploadFolders).forEach((folder) => {
    fs.mkdirSync(folder, { recursive: true });
  });
}
