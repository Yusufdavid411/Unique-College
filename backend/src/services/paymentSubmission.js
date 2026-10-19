export const pendingReceiptMessage = "A receipt is already awaiting review. Remove it before uploading another, or wait for the admin decision.";

export async function createPendingPayment(database, applicationId, data) {
  try {
    return await database.$transaction(async (transaction) => {
      const pending = await transaction.payment.findFirst({ where: { applicationId, status: "PENDING" }, select: { id: true } });
      if (pending) throw Object.assign(new Error(pendingReceiptMessage), { statusCode: 409 });
      if (data.type === "APPLICATION_FEE") {
        const verified = await transaction.payment.findFirst({ where: { applicationId, type: "APPLICATION_FEE", status: "VERIFIED" }, select: { id: true } });
        if (verified) throw Object.assign(new Error("Your application fee is already verified."), { statusCode: 409 });
      }
      return transaction.payment.create({ data: { ...data, applicationId } });
    }, { isolationLevel: "Serializable", timeout: 15000 });
  } catch (error) {
    if (error.code === "P2034") throw Object.assign(new Error("Another receipt request is being processed. Refresh your payment history before trying again."), { statusCode: 409 });
    throw error;
  }
}
