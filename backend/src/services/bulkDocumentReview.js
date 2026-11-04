import { readyForReview } from "./applicationReview.js";

export async function verifyReviewedDocuments(database, id, versions, actor) {
  return database.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({ where: { id }, include: { payments: true, documents: { where: { supersededAt: null } } } });
    if (!application || application.status === "ADMITTED" || !readyForReview(application)) throw Object.assign(new Error("Only submitted applications awaiting admission can be reviewed."), { statusCode: 409 });
    const documents = application.documents;
    if (!documents.length || documents.length !== versions.length || documents.some((document) => !versions.some((item) => item.id === document.id && item.updatedAt === document.updatedAt.toISOString()))) {
      throw Object.assign(new Error("Documents changed. Reopen and review the current files before confirming."), { statusCode: 409 });
    }
    await transaction.applicationDocument.updateMany({ where: { applicationId: id, supersededAt: null, id: { in: versions.map((item) => item.id) } }, data: { reviewStatus: "VERIFIED", reviewNote: null } });
    await transaction.auditLog.create({ data: { actorId: actor.id, action: "application.documents_batch_verified", targetType: "application", targetId: id } });
    return { verified: documents.length };
  }, { isolationLevel: "Serializable", timeout: 15000 });
}
