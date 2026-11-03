export async function replaceApplicationDocument(database, application, input, actorId) {
  return database.$transaction(async (transaction) => {
    const changed = await transaction.application.updateMany({ where: { id: application.id, updatedAt: application.updatedAt, status: application.status, ...(application.status === "ACCEPTED" ? { clearanceStatus: "CORRECTIONS_REQUIRED" } : {}) }, data: {
      updatedAt: new Date(), ...(input.type === "PASSPORT" ? { passportPath: input.path, passportFileType: input.fileType, passportFileSize: input.fileSize } : {})
    } });
    if (!changed.count) throw Object.assign(new Error("The admission record changed. Refresh before replacing this document."), { statusCode: 409 });
    const previous = await transaction.applicationDocument.updateMany({ where: { applicationId: application.id, type: input.type, supersededAt: null }, data: { supersededAt: new Date() } });
    const document = await transaction.applicationDocument.create({ data: { applicationId: application.id, type: input.type, label: input.label, path: input.path, fileType: input.fileType, fileSize: input.fileSize, reviewStatus: "PENDING", reviewNote: null } });
    await transaction.auditLog.create({ data: { actorId, action: previous.count ? "document.replaced:" + input.type : "document.uploaded:" + input.type, targetType: "document", targetId: document.id } });
    return document;
  }, { isolationLevel: "Serializable", timeout: 15000 });
}
