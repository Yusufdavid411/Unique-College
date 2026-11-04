import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard } from "lucide-react";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath } from "../api/portalLinks.js";
import { useApplicant } from "../context/ApplicantContext.jsx";
import PrivateFileButton from "./PrivateFileButton.jsx";
import LoadingButton from "./LoadingButton.jsx";
import { trustedPaymentCheckout } from "../api/paymentCheckout.js";
import { ErrorToast } from "./ToastNotifications.jsx";
import { useConfirmation } from "../context/ConfirmationContext.jsx";
import { paymentSuccessExpiry, showPaymentSuccess } from "../api/paymentDisplay.js";

export default function FlutterwavePayment() {
  const confirmAction = useConfirmation();
  const { application, formAccess, admission, screening, paymentGateway, refresh } = useApplicant();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now);
  const operation = useRef(false);
  const callbackHandled = useRef(false);
  const pending = application.payments.find((payment) => payment.status === "PENDING");
  const onlinePending = pending?.provider === "FLUTTERWAVE";
  const history = application.payments.filter((payment) => payment.status !== "CANCELLED");

  useEffect(() => {
    const update = () => setNow(Date.now());
    const nextExpiry = application.payments.map(paymentSuccessExpiry).filter((expiry) => expiry > Date.now()).sort((first, second) => first - second)[0];
    const timer = nextExpiry ? window.setTimeout(update, Math.min(nextExpiry - Date.now() + 20, 2147483647)) : null;
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [application.payments, now]);

  const verify = useCallback(async (reference) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await api.post("/payments/flutterwave/verify", { reference });
      if (response.data.data.status === "VERIFIED") {
        navigate(portalPath("/applicant/payments"), { replace: true });
        await refresh();
      } else setNotice("Your payment has not been confirmed yet. Do not pay again; check its status shortly.");
    } catch (error) { setNotice(apiErrorMessage(error, "Payment verification is unavailable. Do not pay again; check shortly.")); }
    finally { operation.current = false; setBusy(false); }
  }, [navigate, refresh]);

  useEffect(() => {
    const reference = new URLSearchParams(search).get("tx_ref");
    if (!reference || callbackHandled.current) return;
    callbackHandled.current = true;
    verify(reference);
  }, [search, verify]);

  async function checkout(type) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await api.post("/payments/flutterwave/checkout", { type });
      const link = new URL(response.data.data.link);
      if (!trustedPaymentCheckout(link, paymentGateway.mode)) throw new Error("Invalid payment address");
      window.location.assign(link.href);
    } catch (error) { setNotice(apiErrorMessage(error, "Checkout could not be opened. Please try again shortly.")); }
    finally { operation.current = false; setBusy(false); }
  }

  async function withdrawLegacyReceipt() {
    if (operation.current || !pending || onlinePending) return;
    if (!await confirmAction({ title: "Withdraw this receipt?", message: "Do not pay again if you have already transferred money. Contact Admissions if you are unsure.", confirmLabel: "Withdraw receipt", danger: true })) return;
    operation.current = true;
    setBusy(true);
    try { await api.delete(`/applicant/payments/${pending.id}`); await refresh(); }
    catch (error) { setNotice(apiErrorMessage(error, "The receipt could not be withdrawn.")); }
    finally { operation.current = false; setBusy(false); }
  }

  function feeCard(type, label, amount, paid, available) {
    if (paid && !showPaymentSuccess(application.payments, type, amount, now)) return null;
    const feePending = pending?.type === type ? pending : null;
    const canResume = feePending?.provider === "FLUTTERWAVE";
    const blocked = Boolean(pending && (!canResume || pending.type !== type));
    return <section className="portal-alert payment-bank-card" key={type} aria-label={label}>
      <span className="eyebrow">{label}</span><strong className="payment-fee-value">{amount == null ? "Not quoted" : `NGN ${Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`}</strong>
      {paid ? <><p className="payment-success-message"><CheckCircle2 size={20} aria-hidden="true" /><strong>Payment successful</strong></p><p>{type === "APPLICATION_FEE" ? "Your application form is available." : type === "SCREENING_FEE" ? "Your screening payment is confirmed. Check your exam invitation." : "Your acceptance payment is confirmed. Continue your admission progress on the dashboard."}</p><p>Your receipt is available in Payment history below.</p></> : !available ? <p>{admission?.response === "DECLINED" ? "This offer was declined. Contact admissions if you need assistance." : "Accept your active admission offer on the dashboard before paying this fee."}</p> : <>
        {!paymentGateway.ready && <p role="status">Online payments are temporarily unavailable for this account. Please check back shortly. Do not transfer money outside this checkout.</p>}
        {blocked && <p>Another payment is awaiting confirmation. Check its status before paying again.</p>}
        {pending && !onlinePending && <button type="button" className="button secondary" disabled={busy} onClick={withdrawLegacyReceipt}>Withdraw incorrect receipt</button>}
        <LoadingButton type="button" loading={busy} loadingText="Please wait…" disabled={busy || !paymentGateway.ready || blocked || amount == null} onClick={() => checkout(type)}><CreditCard size={18} /> {canResume ? "Resume Flutterwave checkout" : "Pay with Flutterwave"}</LoadingButton>
        {canResume && <button type="button" className="button secondary" disabled={busy} onClick={() => verify(feePending.reference)}>Check payment status</button>}
      </>}
    </section>;
  }

  return <div className="portal-page">
    <header className="portal-page-header"><div><span className="eyebrow">Secure online payment</span><h1>Payments</h1><p>Pay through Flutterwave. Confirmation and separate receipts are automatic.</p></div></header>
    {admission?.offered && feeCard("ACCEPTANCE_FEE", "Acceptance fee", admission.amount, admission.paid, admission.canPay)}
    {(screening?.eligible || screening?.paid) && feeCard("SCREENING_FEE", "Screening / entrance-exam fee", screening.amount, screening.paid, true)}
    {feeCard("APPLICATION_FEE", "Application form fee", formAccess.amount, formAccess.unlocked, true)}
    <ErrorToast message={notice} />
    <section className="payment-history"><h2>Payment history</h2>
      {!history.length && <div className="empty-state">No payments yet.</div>}
      {history.map((payment) => <article key={payment.id}>
        <span className={`payment-status-icon ${payment.status.toLowerCase()}`}><CreditCard /></span>
        <div><strong>{payment.type === "ACCEPTANCE_FEE" ? "Acceptance fee" : payment.type === "APPLICATION_FEE" ? "Application form fee" : payment.type.replaceAll("_", " ")}</strong><span>NGN {Number(payment.amount).toLocaleString()} · {payment.reference}</span><small>{payment.status === "VERIFIED" ? "Payment verified" : payment.provider === "FLUTTERWAVE" ? "Awaiting payment confirmation" : payment.status}</small></div>
        {payment.status === "VERIFIED" && <div className="payment-receipt-actions"><PrivateFileButton endpoint={`/records/applications/${application.id}/payments/${payment.id}/receipt`} filename={`${payment.reference}-receipt.pdf`}>Download payment receipt (PDF)</PrivateFileButton></div>}
      </article>)}
    </section>
    {admission?.offered ? <div className="applicant-next-step"><p>Return to your dashboard to track your offer and clearance.</p><button type="button" className="button" onClick={() => navigate(portalPath("/applicant"))}>View admission progress</button></div> : <div className="applicant-next-step"><p>{formAccess.unlocked ? "Continue to your application form." : "Your form unlocks once Flutterwave confirms payment."}</p><button type="button" className="button primary" disabled={!formAccess.unlocked || busy} onClick={() => navigate(portalPath("/applicant/application"))}>Next: Application form</button></div>}
  </div>;
}
