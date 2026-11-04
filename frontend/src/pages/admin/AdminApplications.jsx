import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { portalPath } from "../../api/portalLinks.js";
import { api, apiErrorMessage } from "../../api/client.js";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import ApplicationRecord from "../../components/ApplicationRecord.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
import ScreeningReview from "../../components/ScreeningReview.jsx";
import { SendPasswordReset } from "../../components/PasswordRecovery.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const readableStatus = (value) => ({ SCREENING_APPROVED: "Accept for screening", INTERVIEW_SCHEDULED: "Screening scheduled", SUBMITTED: "New submission", PENDING: "Under review", REVIEWED: "Under review", RETURNED: "Corrections required", ACCEPTED: "Admission offered", ADMITTED: "Admitted", DRAFT: "Not submitted" }[value] || value?.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()));
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Not submitted";

export default function AdminApplications() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedApplication = searchParams.get("application");
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [statusChoice, setStatusChoice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [filter, setFilter] = useState("all");
  const dialog = useRef(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/applications");
      setApplications(data.data || []);
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to load applications.")); }
    finally { setLoading(false); }
  }, []);
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
      setStatusChoice(data.data.status);
      setSelectedApplication(data.data);
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to open this application.")); }
  }

  useEffect(() => {
    if (requestedApplication) openApplication(requestedApplication);
  }, [requestedApplication]);

  async function updateApplicationStatus(event) {
    event.preventDefault();
    if (!selectedApplication || saving) return;
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setFeedback("");
    try {
      const status = formData.get("status");
      const { data } = await api.patch(`/applications/${selectedApplication.id}/status`, { status, ...(status === "REJECTED" ? { reviewNote: formData.get("reviewNote") } : {}) });
      setSelectedApplication(data.data.application);
      setStatusChoice(data.data.application.status);
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

  async function sendReminder() {
    if (!selectedApplication || saving) return;
    setSaving(true);
    setFeedback("");
    const endpoint = `/applications/${selectedApplication.id}`;
    try {
      const { data } = await api.post(`${endpoint}/reminder`);
      setFeedback(data.message);
      const response = await api.get(endpoint, { notifyOnError: false }).catch(() => null);
      if (response) setSelectedApplication(response.data.data);
    } catch (error) { setFeedback(error.response?.status === 429 && error.response.data?.message ? error.response.data.message : apiErrorMessage(error, "Unable to send the reminder.")); }
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

  async function saveClearance(event) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setFeedback("");
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/clearance`, { status: fields.get("status"), note: fields.get("note") });
      await openApplication(selectedApplication.id);
      setFeedback(data.message);
    } catch (error) { setFeedback(apiErrorMessage(error, "Clearance could not be updated.")); }
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
  async function deleteApplicantAccount(event) {
    event.preventDefault();
    if (saving || !selectedApplication?.applicant) return;
    const confirmation = String(new FormData(event.currentTarget).get("confirmation") || "").trim();
    if (confirmation.toLowerCase() !== selectedApplication.applicant.email.toLowerCase()) {
      setFeedback("Enter the exact account email to confirm deletion.");
      return;
    }
    if (!window.confirm("Permanently delete this applicant login? The applicant will lose access to this application. Application and payment records will be retained.")) return;
    setSaving(true);
    try {
      const { data } = await api.delete(`/applications/${selectedApplication.id}/account`, { data: { confirmation } });
      setSelectedApplication(null);
      setFeedback(data.message);
      await loadApplications();
    } catch (error) {
      setFeedback(apiErrorMessage(error));
    } finally { setSaving(false); }
  }

  const ready = selectedApplication?.reviewReady;
  const canRemind = selectedApplication?.applicant?.isActive && selectedApplication.applicant.role === "APPLICANT" && !selectedApplication.submittedAt && ["DRAFT", "PENDING"].includes(selectedApplication.status) && (user?.role === "ADMIN" || user?.permissions?.includes("applications.review"));
  const notification = selectedApplication?.statusHistory?.find((event) => event.emailStatus !== "NOT_REQUIRED" && event.emailRecipient);

  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Admissions office</span><h1>Applications</h1><p>Review submitted applications and keep applicants informed.</p></header>
    {!selectedApplication && feedback && <p className="admin-feedback" role="status">{feedback}</p>}
    <div className="review-filters" role="group" aria-label="Application queue">{[["all", "All applications"], ["submitted", "Submitted applications"], ["waiting", "Not ready for review"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="admin-table-card"><div className="admin-table-wrap"><table className="review-queue">
      <thead><tr><th>Applicant</th><th>Programme</th><th>Submitted</th><th>Status / review</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan="4">Loading applications…</td></tr> : visibleApplications.length ? visibleApplications.map((application) => <tr key={application.id}>
        <td data-label="Applicant"><strong>{application.fullName}</strong><small>{application.applicationNumber || application.email}</small></td>
        <td data-label="Programme">{application.courseOfInterest || "Not submitted"}</td><td data-label="Submitted">{formatDate(application.submittedAt)}</td>
        <td><button className={`review-status-button status-chip--${application.status.toLowerCase()}`} type="button" onClick={() => openApplication(application.id)} aria-label={`View status for ${application.fullName}`}><span>{application.status === "RETURNED" || application.reviewReady ? application.screeningStatus === "APPROVED" && application.status === "REVIEWED" ? "Accepted for screening" : readableStatus(application.status) : "Awaiting submission"}</span>{application.status === "SUBMITTED" && <small>New</small>}<span aria-hidden="true">→</span></button></td>
      </tr>) : <tr><td colSpan="4">{filter === "submitted" ? "No submitted applications are ready for review." : "No applicants in this queue."}</td></tr>}</tbody>
    </table></div></div>
    {selectedApplication && <div className="application-review-backdrop">
      <section ref={dialog} tabIndex={-1} onKeyDown={dialogKeyDown} className="application-review-panel" role="dialog" aria-modal="true" aria-labelledby="application-review-title">
        <header className="application-review-panel__header"><div><span className="eyebrow">Application status</span><h2 id="application-review-title">{selectedApplication.fullName}</h2><p>{selectedApplication.applicationNumber}</p></div><button className="icon-button" type="button" disabled={saving} onClick={() => setSelectedApplication(null)} aria-label="Close application"><X size={20} /></button></header>
        <div className="application-review-panel__content">
          <section className="review-status-card"><span className="eyebrow">Current status</span><h3>{ready || selectedApplication.status === "RETURNED" ? selectedApplication.screeningStatus === "APPROVED" && selectedApplication.status === "REVIEWED" ? "Accepted for screening" : readableStatus(selectedApplication.status) : "Awaiting submission"}</h3><p>{ready ? `Submitted ${formatDate(selectedApplication.submittedAt)}. Review the form and documents below before updating the status.` : selectedApplication.status === "RETURNED" ? "Waiting for the applicant to correct and resubmit their form." : selectedApplication.paymentConfirmed ? "Payment confirmed. The applicant has not submitted their form for review yet." : "Waiting for successful payment and a submitted application. No form is available for review yet."}</p>
            {canRemind && <div>
              <button className="button primary" type="button" disabled={saving} onClick={sendReminder}><Bell size={18} aria-hidden="true" />Send application reminder</button>
              <p>Sends the deadline and a link to continue by email and portal notification. Set the date under <Link to={portalPath("/admin/settings") + "#admissions-availability"}>Admissions availability</Link>.</p>
            </div>}
            {ready && <section aria-label="Admissions roadmap">
              <strong>Admissions roadmap</strong>
              <ul>
                <li>Under review → <strong>Accept for screening</strong> → Screening fee verified → Screening scheduled</li>
                <li>After the exam → <strong>Publish individual result</strong> → Passed → <strong>Admission offered</strong></li>
                <li>Offer accepted → Acceptance payment → Acceptance form and clearance → <strong>Admitted</strong> → Student portal</li>
                <li>Under review → <strong>Reject</strong>, or choose <strong>Corrections required</strong> to let the applicant edit and resubmit.</li>
              </ul>
              {selectedApplication.screeningStatus === "APPROVED" && selectedApplication.status === "REVIEWED" && (selectedApplication.screeningPaid ? <Link className="button secondary" to={portalPath("/admin/screening")}>Go to Screening &amp; exams</Link> : <p>Next: Wait for the applicant’s screening fee to be verified.</p>)}
            </section>}
            {!ready && selectedApplication.reviewNote && <p>{selectedApplication.reviewNote}</p>}
            {ready && <form key={`${selectedApplication.id}-${selectedApplication.status}`} className="application-review-form" onSubmit={updateApplicationStatus}>
              <label>Update status<select name="status" defaultValue={selectedApplication.status} onChange={(event) => setStatusChoice(event.target.value)} disabled={saving}>{(selectedApplication.allowedStatuses || [selectedApplication.status]).map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}</select></label>
              {statusChoice === "REJECTED" && <label>Reason for rejection<textarea name="reviewNote" rows="3" maxLength={2000} required defaultValue={selectedApplication.status === "REJECTED" ? selectedApplication.reviewNote || "" : ""} placeholder="Type the exact issue and what needs to be corrected so the applicant knows what to change." disabled={saving} /></label>}
              <button className="button primary application-status-submit" type="submit" disabled={saving}><Check size={18} aria-hidden="true" />{saving ? "Saving…" : "Update application status"}</button>
            </form>}
          </section>
          {user?.role === "ADMIN" && selectedApplication.applicant?.role === "APPLICANT" && selectedApplication.status !== "ADMITTED" && <details className="review-disclosure" key={selectedApplication.id}><summary>Delete applicant account</summary>
            <form className="application-review-form" onSubmit={deleteApplicantAccount}>
              <p>This permanently removes the login and releases <strong>{selectedApplication.applicant.email}</strong> for a new registration. The old application, documents and payments stay on file and will not transfer to the new account.</p>
              <label>Type the account email to confirm<input name="confirmation" type="email" maxLength={254} required autoComplete="off" disabled={saving} /></label>
              <button className="button secondary" type="submit" disabled={saving}>Permanently delete account</button>
            </form>
          </details>}
          {selectedApplication.admission?.offered && <details className="review-disclosure"><summary>Offer, acceptance fee and clearance</summary>
            <dl className="admission-summary"><div><dt>Applicant response</dt><dd>{selectedApplication.admission.response.toLowerCase()}</dd></div><div><dt>Quoted acceptance fee</dt><dd>{selectedApplication.admission.amount == null ? "Not quoted" : `NGN ${Number(selectedApplication.admission.amount).toLocaleString("en-NG")}`}</dd></div><div><dt>Payment</dt><dd>{selectedApplication.admission.paid ? "Confirmed" : "Awaiting payment"}</dd></div><div><dt>Clearance</dt><dd>{selectedApplication.admission.clearanceStatus.toLowerCase().replaceAll("_", " ")}</dd></div></dl>
            {selectedApplication.status === "ACCEPTED" && <form className="application-review-form" key={`${selectedApplication.id}-${selectedApplication.clearanceStatus}`} onSubmit={saveClearance}><label>Clearance decision<select name="status" defaultValue={selectedApplication.clearanceStatus || "PENDING"} disabled={saving}><option value="PENDING">Pending clearance</option><option value="CORRECTIONS_REQUIRED">Corrections required</option><option value="CLEARED">Cleared for final admission</option></select></label><label>Clearance note<textarea name="note" rows={3} maxLength={2000} defaultValue={selectedApplication.clearanceNote || ""} disabled={saving} /></label><p>Clearance requires the applicant's acceptance, confirmed acceptance fee and verified required documents. Once cleared, choose Admitted in Update status.</p><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save clearance"}</button></form>}
          </details>}
          {feedback && <p className="admin-feedback" role="status">{feedback}</p>}
          {ready && <>
            <ScreeningReview application={selectedApplication} refresh={openApplication} />
            <details className="review-disclosure"><summary>View submitted application</summary><ApplicationRecord application={selectedApplication} /></details>
            <details className="review-disclosure"><summary>Review supporting documents</summary><div className="review-items">{selectedApplication.documents?.length ? selectedApplication.documents.map((document) => <div key={document.id} className="review-item"><PrivateFileButton path={document.path}>{readableStatus(document.type)}</PrivateFileButton><label>Document status<select disabled={saving} value={document.reviewStatus} onChange={(event) => updateDocument(document.id, event.target.value)}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Corrections required</option></select></label></div>) : <p>No supporting documents supplied.</p>}</div></details>
          </>}
          {(user?.role === "ADMIN" || user?.permissions?.includes("users.manage")) && selectedApplication.applicant && <details className="review-disclosure"><summary>Account recovery</summary><SendPasswordReset key={selectedApplication.id} applicationId={selectedApplication.id} /></details>}
          {(ready || selectedApplication.payments?.some((payment) => payment.status === "VERIFIED")) && <details className="review-disclosure"><summary>Downloads and payment receipts</summary><ApplicationDownloads application={selectedApplication} /></details>}
          {(ready || notification) && <details className="review-disclosure"><summary>Status history and email notifications</summary>
            <p>{notification?.emailStatus === "SENT" ? "Latest notification accepted by the email provider." : selectedApplication.emailConfigured ? "Notifications are queued or awaiting retry." : "Email sending is not configured. Status updates are still visible in the applicant portal."}</p>
            {notification && notification.emailStatus !== "SENT" && <button type="button" className="button secondary" disabled={saving || !selectedApplication.emailConfigured} onClick={retryEmail}>Retry email notification</button>}
            <ol className="review-history">{selectedApplication.statusHistory?.map((event) => <li key={event.id}><strong>{event.kind === "APPLICATION_REMINDER" ? "Application reminder" : event.kind === "SCREENING_APPROVAL" ? "Accepted for screening" : readableStatus(event.toStatus)}</strong><span>{formatDate(event.createdAt)}</span>{event.note && <p>{event.note}</p>}</li>)}</ol>
          </details>}
          {credentials && <div className="admission-credentials"><strong>Student account assigned</strong><span>Username: {credentials.portalUsername}</span><small>The student keeps their existing applicant login and must change their password at the next sign-in to activate student access. No separate password is issued.</small></div>}
        </div>
      </section>
    </div>}
  </div>;
}
