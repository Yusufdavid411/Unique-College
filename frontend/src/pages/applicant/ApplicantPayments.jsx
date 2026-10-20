import { Banknote, CheckCircle2, Clock3, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage, FILE_TRANSFER_TIMEOUT, MAX_UPLOAD_BYTES } from "../../api/client.js";
import LoadingButton from "../../components/LoadingButton.jsx";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { useAdmissions } from "../../context/AdmissionsContext.jsx";

const typeLabels = {
  APPLICATION_FEE: "Application form fee",
  ACCEPTANCE_FEE: "Acceptance fee",
  SCHOOL_FEE: "School fee",
  OTHER: "Other approved payment"
};

export default function ApplicantPayments() {
  const { application, formAccess, loading, refresh } = useApplicant();
  const { policy } = useAdmissions();
  const navigate = useNavigate();
  const [proof, setProof] = useState(null);
  const [form, setForm] = useState({ amount: "", paidAt: "" });
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [notice, setNotice] = useState({ type: "", message: "" });
  useEffect(() => {
    if (formAccess.amount !== null) setForm((current) => ({ ...current, amount: formAccess.amount }));
  }, [formAccess.amount]);
  if (loading) return <div className="portal-loading">Loading payments...</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;
  const history = (application.payments || []).filter((payment) => payment.status !== "CANCELLED");
  const pendingReceipt = history.some((payment) => payment.status === "PENDING");
  const verifiedApplicationFee = history.some((payment) => payment.type === "APPLICATION_FEE" && payment.status === "VERIFIED");

  async function withdraw(paymentId) {
    if (!window.confirm("Remove this receipt and upload a replacement? It will remain in the school's audit history.")) return;
    setWithdrawing(paymentId);
    setNotice({ type: "", message: "" });
    try {
      await api.delete(`/applicant/payments/${paymentId}`);
      await refresh();
      setNotice({ type: "success", message: "Receipt removed. You can upload a replacement." });
    } catch (error) { setNotice({ type: "error", message: apiErrorMessage(error, "Unable to remove receipt.") }); }
    finally { setWithdrawing(""); }
  }

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (pendingReceipt) return setNotice({ type: "error", message: "A receipt is already awaiting review. Remove it before uploading another." });
    if (verifiedApplicationFee) return setNotice({ type: "error", message: "Your application form payment is already verified." });
    if (!proof) return setNotice({ type: "error", message: "Please attach the payment receipt or evidence." });
    if (proof.size > MAX_UPLOAD_BYTES) return setNotice({ type: "error", message: "Choose a receipt of 4 MB or less." });
    setBusy(true);
    setUploadProgress(null);
    setNotice({ type: "", message: "" });
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    data.append("proof", proof);
    try {
      await api.post("/applicant/payments", data, { timeout: FILE_TRANSFER_TIMEOUT, onUploadProgress: (event) => setUploadProgress(event.total ? Math.round(event.loaded / event.total * 100) : null) });
      setForm({ amount: formAccess.amount ?? "", paidAt: "" });
      setProof(null);
      formElement.reset();
      await refresh();
      setNotice({ type: "success", message: "Receipt submitted. Awaiting admin verification." });
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "Payment evidence could not be submitted.") });
      if (error.code === "ECONNABORTED" || !error.response || error.response.status === 409) await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page-header"><div><span className="eyebrow">Form purchase</span><h1>Application form payment</h1></div></header>
      <section className="portal-alert payment-bank-card" aria-labelledby="payment-bank-title">
        {formAccess.amount !== null && <div><span className="eyebrow">Application fee</span><strong className="payment-fee-value">NGN {Number(formAccess.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong></div>}
        <h2 id="payment-bank-title">Bank details</h2>
        <p className="payment-bank-instructions">{policy?.paymentInstructions || "Contact admissions for payment details."}</p>
        <p>{formAccess.unlocked ? "Your application form is available." : "Pay into this account and upload your receipt below."}</p>
      </section>
      {notice.message && <p className={`form-status ${notice.type}`}>{notice.message}</p>}
      {pendingReceipt && <div className="portal-alert" role="status"><strong>Receipt awaiting review</strong><p>Wait for the admin decision, or remove the receipt below before uploading a replacement.</p></div>}

      <div className="payment-layout">
        <form className="portal-form payment-form" onSubmit={submit}>
          <fieldset disabled={busy || pendingReceipt || verifiedApplicationFee}><legend><span><Banknote size={19} /></span>Upload receipt</legend>
            <label>Payment for<input value="Application form fee" readOnly /></label>
            <label>Amount paid (NGN)<input type="number" min="1" step="0.01" value={form.amount} readOnly={formAccess.amount !== null} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
            <label>Date paid<input type="date" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} /></label>
            <label className="document-dropzone"><UploadCloud /><span>{proof?.name || "Choose payment receipt"}</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => setProof(event.target.files?.[0] || null)} required /></label>
            <small>PDF, JPG, PNG or WEBP. Maximum 4 MB.</small>
            <LoadingButton type="submit" loading={busy} loadingText={uploadProgress === 100 ? "Saving receipt…" : uploadProgress === null ? "Uploading receipt…" : `Uploading ${uploadProgress}%…`}>Submit for verification</LoadingButton>
          </fieldset>
        </form>

        <section className="payment-history">
          <h2>Payment history</h2>
          {!history.length && <div className="empty-state">No receipts uploaded yet.</div>}
          {history.map((payment) => (
            <article key={payment.id}>
              <span className={`payment-status-icon ${payment.status.toLowerCase()}`}>{payment.status === "VERIFIED" ? <CheckCircle2 /> : payment.status === "REJECTED" ? <XCircle /> : <Clock3 />}</span>
              <div><strong>{typeLabels[payment.type] || payment.type}</strong><span>₦{Number(payment.amount).toLocaleString()} · {payment.reference}</span><small>{payment.status}{payment.reviewNote ? ` — ${payment.reviewNote}` : ""}</small></div>
              <div className="payment-receipt-actions"><PrivateFileButton path={payment.proofPath}>Download evidence</PrivateFileButton>{["PENDING", "REJECTED"].includes(payment.status) && <button className="portal-add-button" type="button" disabled={Boolean(withdrawing)} onClick={() => withdraw(payment.id)}>{withdrawing === payment.id ? "Removing…" : "Remove receipt"}</button>}</div>
            </article>
          ))}
        </section>
      </div>
      <div className="applicant-next-step"><p id="payment-next-help">{formAccess.unlocked ? "Continue to your application form." : "Continue after admin verifies your payment."}</p><button className="button primary" type="button" disabled={!formAccess.unlocked || busy} aria-describedby="payment-next-help" onClick={() => navigate("/applicant/application")}>Next: Application form</button></div>
    </div>
  );
}
