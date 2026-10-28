import { useCallback, useEffect, useState } from "react";
import { Eye, FileCheck2, X } from "lucide-react";
import { api } from "../../api/client.js";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import ApplicationRecord from "../../components/ApplicationRecord.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";

const statusOptions = ["DRAFT", "SUBMITTED", "REVIEWED", "RETURNED", "INTERVIEW_SCHEDULED", "ACCEPTED", "ADMITTED", "REJECTED"];
const readableStatus = (value) => (value || "PENDING").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [credentials, setCredentials] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/applications");
      setApplications(data.data || []);
    } catch {
      setFeedback("Unable to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  async function openApplication(applicationId) {
    setFeedback("");
    setCredentials(null);
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setSelectedApplication(data.data);
    } catch {
      setFeedback("Unable to open this application.");
    }
  }

  async function updateApplicationStatus(event) {
    event.preventDefault();
    if (!selectedApplication) return;
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setFeedback("");
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/status`, {
        status: formData.get("status"),
        reviewNote: formData.get("reviewNote"),
      });
      setSelectedApplication(data.data.application);
      setCredentials(data.data.credentials || null);
      setFeedback("Application review saved.");
      loadApplications();
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to save the application review.");
    } finally {
      setSaving(false);
    }
  }

  async function updateDocument(documentId, reviewStatus) {
    if (!selectedApplication) return;
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/documents/${documentId}`, { reviewStatus });
      await openApplication(selectedApplication.id);
    } catch {
      setFeedback("Unable to update the document review.");
    }
  }

  async function updatePayment(paymentId, status) {
    if (!selectedApplication) return;
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/payments/${paymentId}`, { status });
      await openApplication(selectedApplication.id);
    } catch {
      setFeedback("Unable to update the payment review.");
    }
  }

  const details = { guardian: { name: selectedApplication?.guardianName, phone: selectedApplication?.guardianPhone }, education: selectedApplication?.educationRecords };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <span className="eyebrow">Admissions office</span>
          <h1>Applications</h1>
          <p>Review applications, supporting documents, and payment evidence before making an admission decision.</p>
        </div>
      </div>
      {feedback && <div className="admin-feedback">{feedback}</div>}

      <div className="admin-table-card">
        <div className="admin-table-card__heading"><h2>Applicant queue</h2><span>{applications.length} records</span></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Applicant</th><th>Programme</th><th>Submitted</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5">Loading applications…</td></tr> : applications.length ? applications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.fullName}</strong><small>{application.email}</small></td>
                  <td>{application.courseOfInterest || "Not selected"}</td>
                  <td>{formatDate(application.submittedAt || application.createdAt)}</td>
                  <td><span className={`status-chip status-chip--${application.status.toLowerCase()}`}>{readableStatus(application.status)}</span></td>
                  <td><button className="icon-button" type="button" onClick={() => openApplication(application.id)} aria-label={`Review ${application.fullName}`}><Eye size={18} /></button></td>
                </tr>
              )) : <tr><td colSpan="5">No applications have been received yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApplication && (
        <div className="application-review-backdrop" role="presentation">
          <section className="application-review-panel" role="dialog" aria-modal="true" aria-labelledby="application-review-title">
            <div className="application-review-panel__header">
              <div><span className="eyebrow">Application review</span><h2 id="application-review-title">{selectedApplication.fullName}</h2><p>{selectedApplication.applicationNumber || "Application number pending"} · {selectedApplication.courseOfInterest || "Programme pending"}</p></div>
              <div className="application-review-panel__actions"><button className="icon-button" type="button" onClick={() => setSelectedApplication(null)} aria-label="Close application"><X size={18} /></button></div>
            </div>
            <div className="application-review-panel__content">
              <ApplicationDownloads application={selectedApplication} />
              <details className="no-print"><summary>View the complete application record</summary><ApplicationRecord application={selectedApplication} /></details>
              <div className="application-review-grid">
                <article><h3>Applicant details</h3><dl><div><dt>Email</dt><dd>{selectedApplication.email}</dd></div><div><dt>Phone</dt><dd>{selectedApplication.phoneNumber || "—"}</dd></div><div><dt>Date of birth</dt><dd>{formatDate(selectedApplication.dateOfBirth)}</dd></div><div><dt>Address</dt><dd>{selectedApplication.address || "—"}</dd></div><div><dt>Guardian</dt><dd>{details.guardian?.name || "—"}</dd></div><div><dt>Guardian phone</dt><dd>{details.guardian?.phone || "—"}</dd></div></dl></article>
                <article><h3>Education</h3>{details.education?.length ? <ul className="review-list">{details.education.map((record, index) => <li key={`${record.subject}-${index}`}><strong>{record.subject}</strong><span>{record.grade} · {record.examBody} {record.year}</span></li>)}</ul> : <p className="muted-copy">No education records supplied.</p>}</article>
              </div>
              <article className="review-section"><h3><FileCheck2 size={18} /> Supporting documents</h3>{selectedApplication.documents?.length ? <div className="review-items">{selectedApplication.documents.map((document) => <div key={document.id} className="review-item"><PrivateFileButton path={document.path}>{readableStatus(document.type)}</PrivateFileButton><label>Review status<select value={document.reviewStatus} onChange={(event) => updateDocument(document.id, event.target.value)}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select></label></div>)}</div> : <p className="muted-copy">No documents uploaded.</p>}</article>
              <article className="review-section"><h3>Payments</h3>{selectedApplication.payments?.length ? <div className="review-items">{selectedApplication.payments.map((payment) => <div key={payment.id} className="review-item"><span><strong>{readableStatus(payment.type)}</strong> · ₦{Number(payment.amount).toLocaleString()} {payment.reference ? `(${payment.reference})` : ""}{payment.provider === "FLUTTERWAVE" ? " · Flutterwave (automatic verification)" : ""}</span>{payment.proofPath && <PrivateFileButton path={payment.proofPath}>Download payment evidence</PrivateFileButton>}<select aria-label={`Review payment ${payment.reference || payment.id}`} value={payment.status} disabled={payment.status === "CANCELLED" || payment.provider === "FLUTTERWAVE"} onChange={(event) => updatePayment(payment.id, event.target.value)}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="CANCELLED" disabled>Withdrawn</option></select></div>)}</div> : <p className="muted-copy">No payments recorded.</p>}</article>
              <form className="application-review-form" onSubmit={updateApplicationStatus}><label>Decision status<select name="status" defaultValue={selectedApplication.status}>{(selectedApplication.allowedStatuses || statusOptions).map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}</select></label><label>Review note<textarea name="reviewNote" rows="3" defaultValue={selectedApplication.reviewNote || ""} placeholder="Visible internally and to the applicant where appropriate." /></label><button className="button button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save decision"}</button></form>
              {credentials && <div className="admission-credentials"><strong>Student portal credentials created</strong><span>Username: {credentials.portalUsername}</span><span>Temporary password: {credentials.temporaryPassword}</span><small>Share this securely. The student must change the temporary password on first sign-in.</small></div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
