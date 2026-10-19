import { CheckCircle2, FileText, UploadCloud, XCircle } from "lucide-react";
import { useState } from "react";
import { api, apiErrorMessage, MAX_UPLOAD_BYTES } from "../../api/client.js";
import LoadingButton from "../../components/LoadingButton.jsx";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";
import { useApplicant } from "../../context/ApplicantContext.jsx";

const documentTypes = [
  ["PASSPORT", "Recent passport photograph", "JPG, PNG or WEBP"],
  ["BIRTH_CERTIFICATE", "Birth certificate or declaration of age", "PDF or image"],
  ["NATIONAL_ID", "National identity card", "PDF or image"],
  ["EDUCATIONAL_RESULT", "Educational certificate or result", "WAEC, NECO, GCE, NABTEB or equivalent"],
  ["CHANGE_OF_NAME", "Evidence of change of name", "Only if applicable"]
];

export default function ApplicantDocuments() {
  const { application, formAccess, loading, refresh } = useApplicant();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  if (loading) return <div className="portal-loading">Loading documents...</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;
  if (!formAccess.unlocked) return <FormPurchaseRequired amount={formAccess.amount} />;

  const editable = ["DRAFT", "RETURNED"].includes(application.status);

  async function upload(type, label, file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) return setNotice({ type: "error", message: "Choose a document of 4 MB or less." });
    setBusy(type);
    setNotice({ type: "", message: "" });
    const data = new FormData();
    data.append("type", type);
    data.append("label", label);
    data.append("file", file);
    try {
      await api.post("/applicant/documents", data);
      await refresh();
      setNotice({ type: "success", message: `${label} uploaded successfully.` });
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "The document could not be uploaded.") });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page-header"><div><span className="eyebrow">Credentials</span><h1>Supporting documents</h1><p>Upload clear scans, up to 4 MB each. Admissions reviews each document independently.</p></div></header>
      {!editable && <div className="portal-alert"><strong>Uploads locked during review</strong><p>Admissions will return your application if any replacement is required.</p></div>}
      {notice.message && <p className={`form-status ${notice.type}`}>{notice.message}</p>}
      <section className="document-upload-grid">
        {documentTypes.map(([type, label, help], index) => {
          const uploaded = (application.documents || []).filter((document) => document.type === type);
          const required = index < 4;
          return (
            <article className="document-upload-card" key={type}>
              <div className="document-upload-heading"><span><FileText /></span><div><h2>{label}{required && <sup>Required</sup>}</h2><p>{help}</p></div></div>
              {uploaded.map((document) => (
                <div className="uploaded-document" key={document.id}>
                  <PrivateFileButton path={document.path}>{document.label}</PrivateFileButton>
                  <span className={`review-pill ${document.reviewStatus.toLowerCase()}`}>{document.reviewStatus === "VERIFIED" ? <CheckCircle2 /> : document.reviewStatus === "REJECTED" ? <XCircle /> : null}{document.reviewStatus}</span>
                </div>
              ))}
              {editable && <label className="document-dropzone"><UploadCloud /><span>{busy === type ? "Uploading..." : uploaded.length ? "Upload another file" : "Choose file to upload"}</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={busy === type} onChange={(event) => upload(type, label, event.target.files?.[0])} /></label>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
