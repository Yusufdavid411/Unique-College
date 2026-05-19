export function fileMetadata(file, folderName) {
  if (!file) return {};

  return {
    path: `/uploads/${folderName}/${file.filename}`,
    fileType: file.mimetype,
    fileSize: file.size
  };
}
