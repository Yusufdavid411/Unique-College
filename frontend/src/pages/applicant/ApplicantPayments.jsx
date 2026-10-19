import { Banknote, CheckCircle2, Clock3, Printer, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage, assetUrl } from "../../api/client.js";
import LoadingButton from "../../components/LoadingButton.jsx";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { useAdmissions } from "../../context/AdmissionsContext.jsx";

const typeLabels = {
  APPLICATION_FEE: "Application fee",
  ACCEPTANCE_FEE: "Acceptance fee",
  SCHOOL_FEE: "School fee",
  OTHER: "Other approved payment"
};

export default function ApplicantPayments() {
  const { application, formAccess, loading, refresh } = useApplicant();
  const { policy } = useAdmissions();
  const navigate = useNavigate();
  const [proof, setProof] = useState(null);
  const [form, setForm] = useState({ type: "APPLICATION_FEE", amount: "", reference: "", paidAt: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  useEffect(() => {
    if (formAccess.amount !== null && !formAccess.unlocked) setForm((current) => ({ ...current, type: "APPLICATION_FEE", amount: formAccess.amount }));
  }, [formAccess.amount, formAccess.unlocked]);
  if (loading) return <div className="portal-loading">Loading payments...</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!proof) return setNotice({ type: "error", message: "Please attach the payment receipt or evidence." });
    setBusy(true);
    setNotice({ type: "", message: "" });
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    data.append("proof", proof);
    try {
      await api.post("/applicant/payments", data);
      setForm({ type: "APPLICATION_FEE", amount: "", reference: "", paidAt: "" });
      setProof(null);
      formElement.reset();
      await refresh();
      setNotice({ type: "success", message: "Payment evidence submitted for bursary verification." });
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Payment evidence could not be submitted.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page-header"><div><span className="eyebrow">Payments and receipts</span><h1>Payment records</h1><p>Record only payments made through an account or method officially supplied by the school.</p></div></header>
      <div className="portal-alert warning"><strong>Payment safety</strong><p>Do not pay into a personal account. This page records evidence for verification; it does not process card payments yet.</p></div>
      {formAccess.amount !== null && <div className="portal-alert"><strong>Your quoted form price: NGN {Number(formAccess.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong><p style={{ whiteSpace: "pre-wrap" }}>{policy?.paymentInstructions || "Contact the admissions office for the official payment instructions before paying."}</p><p>{formAccess.unlocked ? "Your form is unlocked." : "Submit application-fee evidence below. Your form unlocks after verification."}</p></div>}
      {notice.message && <p className={`form-status ${notice.type}`}>{notice.message}</p>}

      <div className="payment-layout">
        <form className="portal-form payment-form" onSubmit={submit}>
          <fieldset><legend><span><Banknote size={19} /></span>Record a payment</legend>
            <label>Payment type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Amount paid (NGN)<input type="number" min="1" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
            <label>Bank or transaction reference<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} required /></label>
            <label>Date paid<input type="date" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} /></label>
            <label className="document-dropzone"><UploadCloud /><span>{proof?.name || "Attach receipt or payment evidence"}</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => setProof(event.target.files?.[0] || null)} required /></label>
            <LoadingButton type="submit" loading={busy} loadingText="Submitting...">Submit for verification</LoadingButton>
          </fieldset>
        </form>

        <section className="payment-history">
          <h2>Payment history</h2>
          {!application.payments?.length && <div className="empty-state">No payment evidence has been submitted.</div>}
          {application.payments?.map((payment) => (
            <article key={payment.id}>
              <span className={`payment-status-icon ${payment.status.toLowerCase()}`}>{payment.status === "VERIFIED" ? <CheckCircle2 /> : payment.status === "REJECTED" ? <XCircle /> : <Clock3 />}</span>
              <div><strong>{typeLabels[payment.type] || payment.type}</strong><span>₦{Number(payment.amount).toLocaleString()} · {payment.reference}</span><small>{payment.status}{payment.reviewNote ? ` — ${payment.reviewNote}` : ""}</small></div>
              <PrivateFileButton path={payment.proofPath}>Download evidence</PrivateFileButton>
            </article>
          ))}
        </section>
      </div>
      <div className="applicant-next-step"><p id="payment-next-help">{formAccess.unlocked ? "Payment requirement confirmed. Continue to your application form." : "Next unlocks only after admin verification—not after uploading evidence."}</p><button className="button primary" type="button" disabled={!formAccess.unlocked || busy} aria-describedby="payment-next-help" onClick={() => navigate("/applicant/application")}>Next: Application form</button></div>
    </div>
  );
}
