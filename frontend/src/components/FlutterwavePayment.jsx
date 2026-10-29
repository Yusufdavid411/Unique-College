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

export default function FlutterwavePayment() {
  const { application, formAccess, paymentGateway, refresh } = useApplicant();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const operation = useRef(false);
  const callbackHandled = useRef(false);
  const pending = application.payments.find((payment) => payment.status === "PENDING");
  const onlinePending = pending?.provider === "FLUTTERWAVE";
  const history = application.payments.filter((payment) => payment.status !== "CANCELLED");

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

  async function checkout() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await api.post("/payments/flutterwave/checkout");
      const link = new URL(response.data.data.link);
      if (!trustedPaymentCheckout(link, paymentGateway.mode)) throw new Error("Invalid payment address");
      window.location.assign(link.href);
    } catch (error) { setNotice(apiErrorMessage(error, "Checkout could not be opened. Please try again shortly.")); }
    finally { operation.current = false; setBusy(false); }
  }

  async function withdrawLegacyReceipt() {
    if (operation.current || !pending || onlinePending) return;
    if (!window.confirm("Withdraw this receipt before paying online? Do not pay again if you have already transferred the money.")) return;
    operation.current = true;
    setBusy(true);
    try { await api.delete(`/applicant/payments/${pending.id}`); await refresh(); }
    catch (error) { setNotice(apiErrorMessage(error, "The receipt could not be withdrawn.")); }
    finally { operation.current = false; setBusy(false); }
  }

  return <div className="portal-page">
    <header className="portal-page-header"><div><span className="eyebrow">Secure online payment</span><h1>Application form payment</h1><p>Pay securely through Flutterwave. Your form unlocks automatically after your payment is verified.</p></div></header>
    <section className="portal-alert payment-bank-card">
      <span className="eyebrow">Application fee</span><strong className="payment-fee-value">NGN {Number(formAccess.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
      {formAccess.unlocked ? <p><CheckCircle2 size={18} /> Your application form is available.</p> : <>
        {!paymentGateway.ready && <p role="status">Online payments are temporarily unavailable for this account. Please check back shortly. Do not transfer money outside this checkout.</p>}
        {pending && !onlinePending && <div><p>An existing receipt is awaiting review. Do not pay twice. Wait for its review, or withdraw an incorrect receipt before paying online.</p><button type="button" className="button secondary" disabled={busy} onClick={withdrawLegacyReceipt}>Withdraw incorrect receipt</button></div>}
        <LoadingButton type="button" loading={busy} loadingText="Please wait…" disabled={busy || !paymentGateway.ready || Boolean(pending && !onlinePending)} onClick={checkout}><CreditCard size={18} /> {onlinePending ? "Resume Flutterwave checkout" : "Pay with Flutterwave"}</LoadingButton>
        {onlinePending && <button type="button" className="button secondary" disabled={busy} onClick={() => verify(pending.reference)}>Check payment status</button>}
        <p>No receipt upload or admin approval is needed for payments verified through Flutterwave. If you have already paid, check the status instead of paying again.</p>
      </>}
    </section>
    <ErrorToast message={notice} />
    <section className="payment-history"><h2>Payment history</h2>
      {!history.length && <div className="empty-state">No payments yet.</div>}
      {history.map((payment) => <article key={payment.id}>
        <span className={`payment-status-icon ${payment.status.toLowerCase()}`}><CreditCard /></span>
        <div><strong>Application form fee</strong><span>NGN {Number(payment.amount).toLocaleString()} · {payment.reference}</span><small>{payment.status === "VERIFIED" ? "Payment verified" : payment.provider === "FLUTTERWAVE" ? "Awaiting payment confirmation" : payment.status}</small></div>
        <div className="payment-receipt-actions">{payment.status === "VERIFIED" && <PrivateFileButton endpoint={`/records/applications/${application.id}/payments/${payment.id}/receipt`} filename={`${payment.reference}-receipt.pdf`}>Download receipt</PrivateFileButton>}{payment.proofPath && <PrivateFileButton path={payment.proofPath}>Download evidence</PrivateFileButton>}</div>
      </article>)}
    </section>
    <div className="applicant-next-step"><p>{formAccess.unlocked ? "Continue to your application form." : "Your form unlocks once Flutterwave confirms payment."}</p><button type="button" className="button primary" disabled={!formAccess.unlocked || busy} onClick={() => navigate(portalPath("/applicant/application"))}>Next: Application form</button></div>
  </div>;
}
