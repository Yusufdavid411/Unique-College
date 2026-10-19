export async function auditedMutation(database, event, mutation) {
  return database.$transaction(async (transaction) => {
    const result = await mutation(transaction);
    await transaction.auditLog.create({
      data: {
        actorId: event.actorId,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId || result.id
      }
    });
    return result;
  });
}
