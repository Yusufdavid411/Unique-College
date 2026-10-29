import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

export function paymentConfiguration() {
  const enabled = process.env.PAYMENT_PROVIDER === "flutterwave";
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || "";
  const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH || "";
  const returnUrl = process.env.FLUTTERWAVE_RETURN_URL || "https://apply.uniquecollegekwali.com/payments";
  let databaseName = "";
  try { databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1); } catch {}
  return { enabled, secretKey, webhookHash, returnUrl, mode: process.env.FLUTTERWAVE_MODE || "live", deploymentEnvironment: process.env.VERCEL_ENV || "local", databaseName, testDatabaseName: process.env.FLUTTERWAVE_TEST_DATABASE_NAME || "", restrictedProductionTest: process.env.FLUTTERWAVE_RESTRICTED_PRODUCTION_TEST === "true" };
}

export function paymentConfigurationIssue(config) {
  if (!config.secretKey || !config.webhookHash) return "Online payments are not available yet. Please check back shortly.";
  const testKey = config.secretKey.startsWith("FLWSECK_TEST-");
  if (!["test", "live"].includes(config.mode)) return "Select a valid Flutterwave payment mode.";
  if ((config.mode === "test") !== testKey) return "The Flutterwave key does not match the configured payment mode.";
  if (config.restrictedProductionTest) {
    if (config.mode !== "test" || config.databaseName !== "neondb" || config.deploymentEnvironment !== "production" || config.returnUrl !== "https://apply.uniquecollegekwali.com/payments") return "Restricted testing requires test keys and the official production portal configuration.";
    return null;
  }
  if (config.mode === "test") {
    if (config.deploymentEnvironment === "production") return "Test payments are not permitted on the production deployment.";
    if (!config.testDatabaseName || config.testDatabaseName === "neondb" || config.databaseName !== config.testDatabaseName) return "Test payments require the explicitly configured isolated test database.";
    let hostname;
    try { hostname = new URL(config.returnUrl).hostname; } catch { return "Configure a valid payment return address."; }
    if (hostname === "uniquecollegekwali.com" || hostname.endsWith(".uniquecollegekwali.com") || hostname === "uniquecollegekwali.vercel.app") return "Test payments cannot return to a live school portal.";
  }
  return null;
}

export function publicPaymentConfiguration(application) {
  const config = paymentConfiguration();
  return { provider: config.enabled ? "FLUTTERWAVE" : "MANUAL", ready: config.enabled && !paymentConfigurationIssue(config) && (!config.restrictedProductionTest || application?.isTest === true), mode: config.mode };
}

function failure(message, statusCode = 409) {
  return Object.assign(new Error(message), { statusCode });
}

export function validWebhookHash(signature, secret) {
  if (!secret || typeof signature !== "string") return false;
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function assertVerifiedTransaction(payment, transaction) {
  let amountMatches = false;
  try { amountMatches = new Prisma.Decimal(transaction.amount ?? -1).equals(payment.amount); } catch {}
  if (transaction.tx_ref !== payment.reference || transaction.currency !== payment.currency || !amountMatches) {
    throw failure("Payment details do not match the school's payment record. Please contact admissions.");
  }
  if (!/^\d+$/.test(String(transaction.id))) throw failure("The payment provider returned an invalid transaction ID.");
}

export function trustedFlutterwaveCheckout(url, mode) {
  return url.protocol === "https:" && (url.hostname === "checkout.flutterwave.com" || (mode === "test" && url.hostname === "checkout-v2.dev-flutterwave.com"));
}

export function flutterwaveService(database, fetcher = fetch, config = paymentConfiguration()) {
  function requireReady() {
    if (!config.enabled) throw failure("Online payments are not available yet. Please check back shortly.", 503);
    const issue = paymentConfigurationIssue(config);
    if (issue) throw failure(issue, 503);
    const url = new URL(config.returnUrl);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw failure("The payment return address is not configured securely.", 503);
  }

  async function request(path, body) {
    let response;
    try {
      response = await fetcher(`https://api.flutterwave.com/v3${path}`, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000)
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success" || !result.data) throw failure("Flutterwave could not confirm this request. Do not pay again; check the payment status shortly.", 502);
      return result.data;
    } catch (error) {
      if (error.statusCode) throw error;
      throw failure("The payment provider is temporarily unavailable. Do not pay again; check the payment status shortly.", 503);
    }
  }

  async function start(applicantId) {
    requireReady();
    let reserved;
    try {
      reserved = await database.$transaction(async (transaction) => {
        const application = await transaction.application.findUnique({ where: { applicantId }, include: { payments: true } });
        if (!application) throw failure("Applicant record not found", 404);
        if (config.restrictedProductionTest && !application.isTest) throw failure("Test checkout is available only to the school's designated test account. Real payments are unavailable during testing.", 403);
        if (config.mode === "live" && application.isTest) throw failure("Test accounts cannot make live payments.", 403);
        if (application.formFeeAmount == null || new Prisma.Decimal(application.formFeeAmount).lte(0)) throw failure("No form payment is required for this account.");
        if (application.payments.some((payment) => payment.type === "APPLICATION_FEE" && payment.status === "VERIFIED")) throw failure("Your application fee is already verified. Continue to your form.");
        let payment = application.payments.find((item) => item.status === "PENDING");
        if (payment && payment.provider !== "FLUTTERWAVE") throw failure("An existing receipt is awaiting review. Resolve or withdraw it before paying online.");
        if (!payment) {
          payment = await transaction.payment.create({ data: { applicationId: application.id, isTest: config.mode === "test", type: "APPLICATION_FEE", provider: "FLUTTERWAVE", amount: application.formFeeAmount, currency: "NGN", reference: `UCHK-FLW-${crypto.randomUUID()}` } });
          await transaction.auditLog.create({ data: { actorId: applicantId, action: "payment.checkout.created", targetType: "payment", targetId: payment.id } });
        }
        return { payment, application };
      }, { isolationLevel: "Serializable", timeout: 15000 });
    } catch (error) {
      if (error.code === "P2034") throw failure("Another payment request is in progress. Refresh before trying again.");
      throw error;
    }
    const { payment, application } = reserved;
    if (Boolean(payment.isTest) !== (config.mode === "test")) throw failure("This checkout belongs to a different payment mode. Contact admissions.");
    if (payment.checkoutUrl) return { paymentId: payment.id, reference: payment.reference, link: payment.checkoutUrl };
    const claim = await database.payment.updateMany({ where: { id: payment.id, status: "PENDING", checkoutUrl: null, OR: [{ checkoutStartedAt: null }, { checkoutStartedAt: { lt: new Date(Date.now() - 120000) } }] }, data: { checkoutStartedAt: new Date() } });
    if (!claim.count) throw failure("Your checkout is being prepared. Please wait a moment before trying again.");
    const amount = String(payment.amount);
    const secretHash = crypto.createHash("sha256").update(config.secretKey).digest("hex");
    const payloadHash = crypto.createHash("sha256").update(amount + payment.currency + application.email + payment.reference + secretHash).digest("hex");
    const result = await request("/payments", {
      tx_ref: payment.reference, amount, currency: payment.currency, redirect_url: config.returnUrl,
      payload_hash: payloadHash, session_duration: 1440,
      customer: { email: application.email, name: application.fullName, phonenumber: application.phoneNumber },
      customizations: { title: "Unique College", description: "Application form fee" }
    });
    let checkout;
    try { checkout = new URL(result.link); } catch { throw failure("The payment provider returned an invalid checkout address.", 502); }
    if (!trustedFlutterwaveCheckout(checkout, config.mode)) throw failure("The payment provider returned an untrusted checkout address.", 502);
    await database.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { checkoutUrl: checkout.href } });
    return { paymentId: payment.id, reference: payment.reference, link: checkout.href };
  }

  async function reconcile(transaction, actorId) {
    const payment = await database.payment.findFirst({ where: { reference: transaction.tx_ref, provider: "FLUTTERWAVE" }, include: { application: { select: { applicantId: true, isTest: true } } } });
    if (!payment || (actorId && payment.application.applicantId !== actorId)) throw failure("Payment not found", 404);
    if (Boolean(payment.isTest) !== (config.mode === "test") || (config.restrictedProductionTest && !payment.application.isTest)) throw failure("This transaction cannot be applied to this application's payment mode.", 403);
    assertVerifiedTransaction(payment, transaction);
    if (transaction.status !== "successful") return { paymentId: payment.id, status: payment.status, message: "Payment has not been confirmed. Resume checkout or check again shortly." };
    const transactionId = String(transaction.id);
    if (payment.status === "VERIFIED") {
      if (payment.providerTransactionId !== transactionId) throw failure("A different transaction is already recorded for this payment. Contact admissions.");
      return { paymentId: payment.id, status: "VERIFIED" };
    }
    await database.$transaction(async (db) => {
      const changed = await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "VERIFIED", providerTransactionId: transactionId, paidAt: new Date(), verifiedAt: new Date(), reviewNote: "Automatically verified with Flutterwave" } });
      if (changed.count) await db.auditLog.create({ data: { actorId: payment.application.applicantId || "flutterwave", action: "payment.flutterwave.verified", targetType: "payment", targetId: payment.id } });
      else {
        const current = await db.payment.findUnique({ where: { id: payment.id } });
        if (current?.status !== "VERIFIED" || current.providerTransactionId !== transactionId) throw failure("The payment record changed. Contact admissions before making another payment.");
      }
    });
    return { paymentId: payment.id, status: "VERIFIED" };
  }

  async function verify(reference, applicantId) {
    requireReady();
    const payment = await database.payment.findFirst({ where: { reference, provider: "FLUTTERWAVE", application: { applicantId } }, include: { application: { select: { isTest: true } } } });
    if (!payment) throw failure("Payment not found", 404);
    if (Boolean(payment.isTest) !== (config.mode === "test")) throw failure("This payment belongs to a different payment mode.", 403);
    if (config.restrictedProductionTest && !payment.application.isTest) throw failure("Test verification is restricted to designated test accounts.", 403);
    if (payment.status === "VERIFIED") return { paymentId: payment.id, status: "VERIFIED" };
    const transaction = await request(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(payment.reference)}`);
    assertVerifiedTransaction(payment, transaction);
    return reconcile(transaction, applicantId);
  }

  async function webhook(body) {
    requireReady();
    if (body.event !== "charge.completed") return { ignored: true };
    if (!/^\d+$/.test(String(body.data?.id))) throw failure("Invalid transaction ID", 400);
    const transaction = await request(`/transactions/${body.data.id}/verify`);
    const known = await database.payment.findFirst({ where: { reference: transaction.tx_ref, provider: "FLUTTERWAVE" }, select: { id: true } });
    if (!known) return { ignored: true };
    return reconcile(transaction);
  }

  return { start, verify, webhook };
}
