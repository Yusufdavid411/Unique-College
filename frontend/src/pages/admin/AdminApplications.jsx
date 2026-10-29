import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client.js";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import ApplicationRecord from "../../components/ApplicationRecord.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";

const readableStatus = (value) => ({ SUBMITTED: "New submission", PENDING: "Under review", REVIEWED: "Under review", RETURNED: "Corrections required", ACCEPTED: "Accepted", ADMITTED: "Admitted", DRAFT: "Not submitted" }[value] || value?.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()));
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Not submitted";

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [filter, setFilter] = useState("submitted");
  const [testing, setTesting] = useState(false);
  const dialog = useRef(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/applications", { params: testing ? { testing: "true" } : {} });
      setApplications(data.data || []);
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to load applications.")); }
    finally { setLoading(false); }
  }, [testing]);
  useEffect(() => { loadApplications(); }, [loadApplications]);
  const selectedId = selectedApplication?.id;
  useEffect(() => {
    if (!selectedId) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [selectedId]);

  async function openApplication(applicationId) {
    setFeedback("");
    setCredentials(null);
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setSelectedApplication(data.data);
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to open this application.")); }
  }

  async function updateApplicationStatus(event) {
    event.preventDefault();
    if (!selectedApplication || saving) return;
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setFeedback("");
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/status`, { status: formData.get("status"), reviewNote: formData.get("reviewNote") });
      setSelectedApplication(data.data.application);
      setCredentials(data.data.credentials || null);
      setFeedback(data.data.email?.status === "SENT" ? "Status updated. Notification submitted to the email provider." : "Status updated. Check email notification status below.");
      loadApplications();
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to save the review.")); }
    finally { setSaving(false); }
  }

  async function updateDocument(documentId, reviewStatus) {
    setSaving(true);
    try {
      await api.patch(`/applications/${selectedApplication.id}/documents/${documentId}`, { reviewStatus });
      await openApplication(selectedApplication.id);
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to review this document.")); }
    finally { setSaving(false); }
  }

  async function retryEmail() {
    setSaving(true);
    try {
      const { data } = await api.post(`/applications/${selectedApplication.id}/notifications/retry`);
      setFeedback(data.message);
      const response = await api.get(`/applications/${selectedApplication.id}`);
      setSelectedApplication(response.data.data);
    } catch (error) { setFeedback(apiErrorMessage(error, "Email could not be sent.")); }
    finally { setSaving(false); }
  }

  function dialogKeyDown(event) {
    if (event.key === "Escape" && !saving) setSelectedApplication(null);
    if (event.key !== "Tab") return;
    const focusable = [...dialog.current.querySelectorAll('button:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]')].filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
  }

  const visibleApplications = applications.filter((application) => filter === "all" || (filter === "submitted" ? application.reviewReady : !application.reviewReady));
  const ready = selectedApplication?.reviewReady;
  const notification = selectedApplication?.statusHistory?.find((event) => event.emailStatus !== "NOT_REQUIRED" && event.emailRecipient);

  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Admissions office</span><h1>Applications</h1><p>Review submitted applications and keep applicants informed.</p></header>
    <label className="check-field"><input type="checkbox" checked={testing} onChange={(event) => setTesting(event.target.checked)} />Show test applications only</label>
    {testing && <p className="portal-alert" role="status">TEST RECORDS — these payments and admissions are simulations, excluded from the school's real application totals.</p>}
    {!selectedApplication && feedback && <p className="admin-feedback" role="status">{feedback}</p>}
    <div className="review-filters" role="group" aria-label="Application queue">{[["submitted", "Submitted applications"], ["waiting", "Not ready for review"], ["all", "All applicants"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="admin-table-card"><div className="admin-table-wrap"><table className="review-queue">
      <thead><tr><th>Applicant</th><th>Programme</th><th>Submitted</th><th>Status / review</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan="4">Loading applications…</td></tr> : visibleApplications.length ? visibleApplications.map((application) => <tr key={application.id}>
        <td data-label="Applicant"><strong>{application.fullName}</strong><small>{application.applicationNumber || application.email}</small></td>
        <td data-label="Programme">{application.courseOfInterest || "Not submitted"}</td><td data-label="Submitted">{formatDate(application.submittedAt)}</td>
        <td><button className={`review-status-button status-chip--${application.status.toLowerCase()}`} type="button" onClick={() => openApplication(application.id)} aria-label={`View status for ${application.fullName}`}><span>{application.status === "RETURNED" || application.reviewReady ? readableStatus(application.status) : "Awaiting submission"}</span>{application.status === "SUBMITTED" && <small>New</small>}<span aria-hidden="true">→</span></button></td>
      </tr>) : <tr><td colSpan="4">{filter === "submitted" ? "No submitted applications are ready for review." : "No applicants in this queue."}</td></tr>}</tbody>
    </table></div></div>
    {selectedApplication && <div className="application-review-backdrop">
      <section ref={dialog} tabIndex={-1} onKeyDown={dialogKeyDown} className="application-review-panel" role="dialog" aria-modal="true" aria-labelledby="application-review-title">
        <header className="application-review-panel__header"><div><span className="eyebrow">Application status</span><h2 id="application-review-title">{selectedApplication.fullName}</h2><p>{selectedApplication.applicationNumber}</p></div><button className="icon-button" type="button" disabled={saving} onClick={() => setSelectedApplication(null)} aria-label="Close application"><X size={20} /></button></header>
        <div className="application-review-panel__content">
          {selectedApplication.isTest && <p className="portal-alert" role="status">TEST APPLICATION — decisions, receipts and student credentials here are for testing only.</p>}
          <section className="review-status-card"><span className="eyebrow">Current status</span><h3>{ready || selectedApplication.status === "RETURNED" ? readableStatus(selectedApplication.status) : "Awaiting submission"}</h3><p>{ready ? `Submitted ${formatDate(selectedApplication.submittedAt)}. Review the form and documents below before updating the status.` : selectedApplication.status === "RETURNED" ? "Waiting for the applicant to correct and resubmit their form." : selectedApplication.paymentConfirmed ? "Payment confirmed. The applicant has not submitted their form for review yet." : "Waiting for successful payment and a submitted application. No form is available for review yet."}</p>
            {!ready && selectedApplication.reviewNote && <p>{selectedApplication.reviewNote}</p>}
            {ready && <form key={`${selectedApplication.id}-${selectedApplication.status}`} className="application-review-form" onSubmit={updateApplicationStatus}>
              <label>Update status<select name="status" defaultValue={selectedApplication.status} disabled={saving}>{(selectedApplication.allowedStatuses || [selectedApplication.status]).map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}</select></label>
              <label>Message to applicant<textarea name="reviewNote" rows="3" maxLength={2000} defaultValue={selectedApplication.reviewNote || ""} placeholder="Explain any corrections required or the next step." disabled={saving} /></label>
              <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Update application status"}</button>
            </form>}
          </section>
          {feedback && <p className="admin-feedback" role="status">{feedback}</p>}
          {ready && <>
            <details className="review-disclosure"><summary>View submitted application</summary><ApplicationRecord application={selectedApplication} /></details>
            <details className="review-disclosure"><summary>Review supporting documents</summary><div className="review-items">{selectedApplication.documents?.length ? selectedApplication.documents.map((document) => <div key={document.id} className="review-item"><PrivateFileButton path={document.path}>{readableStatus(document.type)}</PrivateFileButton><label>Document status<select disabled={saving} value={document.reviewStatus} onChange={(event) => updateDocument(document.id, event.target.value)}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Corrections required</option></select></label></div>) : <p>No supporting documents supplied.</p>}</div></details>
          </>}
          {(ready || selectedApplication.payments?.some((payment) => payment.status === "VERIFIED")) && <details className="review-disclosure"><summary>Downloads and payment receipts</summary><ApplicationDownloads application={selectedApplication} /></details>}
          {(ready || notification) && <details className="review-disclosure"><summary>Status history and email notifications</summary>
            <p>{notification?.emailStatus === "SENT" ? "Latest notification accepted by the email provider." : selectedApplication.emailConfigured ? "Notifications are queued or awaiting retry." : "Email sending is not configured. Status updates are still visible in the applicant portal."}</p>
            {notification && notification.emailStatus !== "SENT" && <button type="button" className="button secondary" disabled={saving || !selectedApplication.emailConfigured} onClick={retryEmail}>Retry email notification</button>}
            <ol className="review-history">{selectedApplication.statusHistory?.map((event) => <li key={event.id}><strong>{readableStatus(event.toStatus)}</strong><span>{formatDate(event.createdAt)}</span>{event.note && <p>{event.note}</p>}</li>)}</ol>
          </details>}
          {credentials && <div className="admission-credentials"><strong>Student portal credentials created</strong><span>Username: {credentials.portalUsername}</span><span>Temporary password: {credentials.temporaryPassword}</span><small>Share securely. The student must change this password at first sign-in.</small></div>}
        </div>
      </section>
    </div>}
  </div>;
}
