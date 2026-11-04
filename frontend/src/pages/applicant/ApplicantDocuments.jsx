import { ArrowLeft, CheckCircle2, FileText, Send, UploadCloud, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage, MAX_UPLOAD_BYTES } from "../../api/client.js";
import LoadingButton from "../../components/LoadingButton.jsx";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import PrivateFilePreview from "../../components/PrivateFilePreview.jsx";
import { useConfirmation } from "../../context/ConfirmationContext.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { portalPath } from "../../api/portalLinks.js";
import ApplicationRecord from "../../components/ApplicationRecord.jsx";

const documentTypes = [
  ["PASSPORT", "Recent passport photograph", "JPG, PNG or WEBP"],
  ["BIRTH_CERTIFICATE", "Birth certificate or declaration of age", "PDF or image"],
  ["NATIONAL_ID", "National identity card", "PDF or image"],
  ["EDUCATIONAL_RESULT", "Educational certificate or result", "WAEC, NECO, GCE, NABTEB or equivalent"],
  ["CHANGE_OF_NAME", "Evidence of change of name", "Only if applicable"]
];

export default function ApplicantDocuments() {
  const confirmAction = useConfirmation();
  const { application, journey, formAccess, loading, refresh } = useApplicant();
  const navigate = useNavigate();
  const operation = useRef(false);
  const submitDialog = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  if (loading) return <div className="portal-loading">Loading documents...</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;
  if (!formAccess.unlocked) return <FormPurchaseRequired amount={formAccess.amount} />;
  if (!journey || journey.steps.find((step) => step.id === "documents")?.locked) return <section className="portal-page"><h1>Complete your application form first</h1><p>Save all required form details and your declaration before continuing to supporting documents.</p><Link className="button" to={portalPath("/applicant/application")}>Continue application form</Link></section>;

  const editable = ["DRAFT", "RETURNED"].includes(application.status) || (application.status === "ACCEPTED" && application.clearanceStatus === "CORRECTIONS_REQUIRED");

  async function upload(type, label, file) {
    if (!file || operation.current) return;
    if (file.size > MAX_UPLOAD_BYTES) return setNotice({ type: "error", message: "Choose a document of 4 MB or less." });
    const replacing = (application.documents || []).some((document) => document.type === type && !document.supersededAt);
    if (replacing && !await confirmAction({ title: "Replace uploaded document?", message: `Replace your ${label.toLowerCase()}? Only the new file will be included in your application.`, confirmLabel: "Replace document", cancelLabel: "Keep current file" })) return;
    operation.current = true;
    setBusy(type);
    setNotice({ type: "", message: "" });
    const data = new FormData();
    data.append("type", type);
    data.append("label", label);
    data.append("file", file);
    try {
      await api.post("/applicant/documents", data);
      const updated = await refresh({ background: true });
      if (!updated) {
        setNotice({ type: "error", message: "Your file was saved, but the document list could not refresh. Reload the page to see the new file; you do not need to upload it again." });
        return;
      }
      setNotice({ type: "success", message: `${label} ${replacing ? "replaced" : "uploaded"} successfully.` });
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "The document could not be uploaded.") });
    } finally {
      setBusy("");
      operation.current = false;
    }
  }

  async function submitForReview() {
    if (operation.current || !journey.canSubmit) return;
    operation.current = true;
    setBusy("submit");
    setNotice({ type: "", message: "" });
    try {
      await api.post("/applicant/application/submit");
      const saved = await refresh();
      if (saved) navigate(portalPath("/applicant"));
    } catch (error) {
      const missing = error.response?.data?.data?.missing;
      setNotice({ type: "error", message: missing?.length ? `Complete these items first: ${missing.join(", ")}.` : apiErrorMessage(error, "Your application could not be submitted. Refresh its status before trying again.") });
    } finally {
      setBusy("");
      operation.current = false;
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page-header"><div><span className="eyebrow">Credentials</span><h1>Supporting documents</h1><p>One file per document type, up to 4 MB each. Uploaded files are verified by admissions after you submit.</p></div></header>
      {!editable && <div className="portal-alert"><strong>Uploads locked during review</strong><p>Admissions will return your application if any replacement is required.</p></div>}
      {notice.type === "error" ? <ErrorToast message={notice.message} incident={notice} /> : notice.message && <p className={`form-status ${notice.type}`}>{notice.message}</p>}
      <section className="document-upload-grid">
        {documentTypes.map(([type, label, help], index) => {
          const document = (application.documents || []).find((record) => record.type === type && !record.supersededAt);
          const required = index < 4;
          return (
            <article className="document-upload-card" key={type}>
              <div className="document-upload-heading"><span><FileText /></span><div><h2>{label}{required && <sup>Required</sup>}</h2><p>{help}</p></div></div>
              {document && (
                <div className="uploaded-document" key={document.id}>
                  <PrivateFilePreview path={document.path} label={document.label} />
                  <span className={`review-pill ${document.reviewStatus.toLowerCase()}`}>{document.reviewStatus === "VERIFIED" ? <CheckCircle2 /> : document.reviewStatus === "REJECTED" ? <XCircle /> : null}{document.reviewStatus === "VERIFIED" ? "Verified" : document.reviewStatus === "REJECTED" ? "Replace required" : journey.submitted ? "Awaiting review" : "Uploaded"}</span>
                </div>
              )}
              {document?.reviewNote && <p className="document-review-note">{document.reviewNote}</p>}
              {editable && <label className="document-dropzone"><UploadCloud /><span>{busy === type ? "Uploading..." : document ? "Replace file" : "Choose file to upload"}</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; upload(type, label, file); }} /></label>}
            </article>
          );
        })}
      </section>
      {["DRAFT", "RETURNED"].includes(application.status) && <section className="student-card"><h2>Submit your application for review</h2>{journey.documentsMissing.length ? <><p>Upload or replace these required documents before submitting:</p><ul>{journey.documentsMissing.map((label) => <li key={label}>{label}</li>)}</ul></> : <p>All required uploads are present. Check your saved details and documents before submitting.</p>}<details><summary>Review saved application details</summary><ApplicationRecord application={application} /></details></section>}
      {["DRAFT", "RETURNED"].includes(application.status) && <div className="document-page-actions"><Link className="button secondary" to={portalPath("/applicant/application")}><ArrowLeft size={18} />Previous: Application form</Link><LoadingButton type="button" disabled={Boolean(busy) || !journey.canSubmit} loading={busy === "submit"} loadingText="Submitting…" onClick={() => submitDialog.current.showModal()}><Send size={18} />Submit for review</LoadingButton></div>}
      <dialog ref={submitDialog} className="private-preview-dialog application-submit-dialog" aria-labelledby="submit-review-title" aria-describedby="submit-review-description">
        <h2 id="submit-review-title">Submit your application?</h2>
        <p id="submit-review-description">Your saved form and supporting documents will be locked while admissions reviews them.</p>
        <form method="dialog" className="document-page-actions">
          <button className="button secondary" type="submit">Keep editing</button>
          <button className="button primary" type="button" onClick={() => { submitDialog.current.close(); submitForReview(); }}><Send size={18} />Confirm submission</button>
        </form>
      </dialog>
      {!["DRAFT", "RETURNED"].includes(application.status) && <div className="document-page-actions"><Link className="button secondary" to={portalPath("/applicant/application")}><ArrowLeft size={18} />Previous: Application form</Link><Link className="button" to={portalPath("/applicant")}>View application status</Link></div>}
    </div>
  );
}
