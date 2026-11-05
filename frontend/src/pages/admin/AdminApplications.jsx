import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { portalPath } from "../../api/portalLinks.js";
import { api, apiErrorMessage } from "../../api/client.js";
import PrivateFilePreview from "../../components/PrivateFilePreview.jsx";
import ApplicationRecord from "../../components/ApplicationRecord.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
import ScreeningReview from "../../components/ScreeningReview.jsx";
import { SendPasswordReset } from "../../components/PasswordRecovery.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import AdminDirectorySearch, { matchesDirectorySearch } from "../../components/AdminDirectorySearch.jsx";
import { useConfirmation } from "../../context/ConfirmationContext.jsx";
import { watDate } from "../../data/admissionsExamples.js";
import ApplicationBulkNotice from "../../components/ApplicationBulkNotice.jsx";
import BulkFinalAdmission from "../../components/BulkFinalAdmission.jsx";

const queues = { all: "All applications", submitted: "Submitted applications", waiting: "Not ready for review", corrections: "Corrections required", screening: "In screening", passed: "Screening complete", offered: "Admission offered", failed: "Screening unsuccessful", rejected: "Rejected" };

const readableStatus = (value) => ({ SCREENING_APPROVED: "Accept for screening", INTERVIEW_SCHEDULED: "Screening scheduled", SUBMITTED: "New submission", PENDING: "Under review", REVIEWED: "Under review", RETURNED: "Corrections required", ACCEPTED: "Admission offered", ADMITTED: "Admitted", DRAFT: "Not submitted" }[value] || value?.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()));
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Not submitted";
const screeningLabels = { APPROVED: "Accepted for screening", PASSED: "Screening passed", FAILED: "Screening not successful" };
const applicationStatusLabel = (application) => {
  if (application.status === "RETURNED") return readableStatus(application.status);
  if (!application.reviewReady) return "Awaiting submission";
  if (application.status === "SUBMITTED" && application.screeningStatus === "PASSED") return "Resubmitted · Screening passed";
  return (application.status === "REVIEWED" && screeningLabels[application.screeningStatus]) || readableStatus(application.status);
};

function applicationNextStep(application, allowed, canAdmit) {
  const { status, screeningStatus, admission, admissionPaymentBlocker, admissionDocumentsReady } = application;
  if (status === "RETURNED") return { message: "Wait for the applicant to correct and resubmit the application. No further review action is needed yet." };
  if (!application.reviewReady) return { message: application.paymentConfirmed ? "Wait for the applicant to submit their completed form and documents." : "Wait for the application fee and completed submission." };
  if (status === "ADMITTED") return application.admissionLetters?.length
    ? { message: "Admission is final. Manage this record under Students." }
    : { message: "Make the admission letter available for this existing student without changing their admission or login details.", status: canAdmit ? "ADMITTED" : null, label: "Prepare admission documents" };
  if (status === "REJECTED") return { message: "Application rejected. Request corrections only if the applicant should be allowed to resubmit." };
  if (status === "ACCEPTED") {
    if (admission?.response === "DECLINED") return { message: "The applicant declined the offer." };
    if (admission?.response !== "ACCEPTED") return { message: "Wait for the applicant to accept the provisional offer." };
    if (!admission.paid) return { message: "Wait for the applicant’s acceptance fee to be verified." };
    if (admissionPaymentBlocker) return { message: admissionPaymentBlocker };
    if (application.requiresAcceptanceForm && !application.schoolForms?.some((form) => form.kind === "ACCEPTANCE" && form.status === "SUBMITTED")) return { message: "Wait for the applicant to submit the acceptance form." };
    if (!admissionDocumentsReady) return { message: "Verify the required documents before completing admission.", documents: true };
    if (application.letterSetupBlocker) return { message: application.letterSetupBlocker, settings: true };
    if (admission.clearanceStatus !== "CLEARED") return { message: "Review the applicant’s record and complete clearance.", clearance: canAdmit };
    if (allowed.includes("ADMITTED")) return { message: "Confirm final admission to release the admission letter and enable student access together.", status: canAdmit ? "ADMITTED" : null, label: "Admit & release letter" };
    return { message: "Check the offer and clearance details below before confirming final admission." };
  }
  if (allowed.includes("SCREENING_APPROVED")) return { message: "Review the submitted form and documents before accepting this applicant for screening.", status: "SCREENING_APPROVED", label: "Accept for screening" };
  if (status === "INTERVIEW_SCHEDULED") return { message: "Record the outcome on the Screening & exams page.", screening: true };
  if (screeningStatus === "APPROVED") return application.screeningPaid ? { message: "Screening fee verified. Schedule the exam.", screening: true } : { message: "Wait for the screening fee to be verified." };
  if (screeningStatus === "FAILED") return { message: "The applicant did not pass screening. No admission offer is available." };
  if (["PASSED", "EXEMPT"].includes(screeningStatus) && ["SUBMITTED", "REVIEWED"].includes(status)) {
    if (admissionPaymentBlocker) return { message: "The screening result is retained. " + admissionPaymentBlocker + " Do not reject or return this application just to get past the payment check." };
    if (!admissionDocumentsReady) return { message: "Verify the required documents before issuing a provisional offer.", documents: true };
    if (allowed.includes("ACCEPTED")) return { message: canAdmit ? "Issue the provisional offer so the applicant can accept it and pay the acceptance fee." : "An authorised admissions administrator can issue the provisional offer.", status: canAdmit ? "ACCEPTED" : null, label: "Issue provisional offer" };
  }
  return { message: "There is no forward action available for this record. Check the application and screening history below." };
}

export default function AdminApplications() {
  const confirmAction = useConfirmation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedApplication = searchParams.get("application");
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const dialog = useRef(null);
  const documentsPanel = useRef(null);
  const nextAction = useRef(null);
  const rejectButton = useRef(null);

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
    setRejecting(false);
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setSelectedApplication(data.data);
    } catch (error) { setFeedback(apiErrorMessage(error, "Unable to open this application.")); }
  }

  useEffect(() => {
    if (requestedApplication) openApplication(requestedApplication);
  }, [requestedApplication]);

  async function updateApplicationStatus(status, reviewNote) {
    if (!selectedApplication || saving) return;
    setSaving(true);
    setFeedback("");
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/status`, { status, ...(status === "REJECTED" ? { reviewNote } : {}) });
      setSelectedApplication(data.data.application);
      setRejecting(false);
      setCredentials(data.data.credentials || null);
      setFeedback(data.data.email?.status === "SENT" ? "Status updated. Notification submitted to the email provider." : "Status updated. Check email notification status below.");
      nextAction.current?.focus();
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

  async function verifyAllDocuments() {
    if (saving || !selectedApplication) return;
    setSaving(true);
    try {
      if (!await confirmAction({ title: "Verify all reviewed documents?", message: "Confirm you have opened and checked every current document for this applicant. This does not approve payments or grant admission.", confirmLabel: "I reviewed them — verify all" })) return;
      await api.post(`/applications/${selectedApplication.id}/documents/verify-all`, { reviewed: true, documents: selectedApplication.documents.map(({ id, updatedAt }) => ({ id, updatedAt })) });
      await openApplication(selectedApplication.id);
    } catch (error) { setFeedback(apiErrorMessage(error)); }
    finally { setSaving(false); }
  }

  async function sendReminder() {
    if (!selectedApplication || saving) return;
    setSaving(true);
    setFeedback("");
    const endpoint = `/applications/${selectedApplication.id}`;
    try {
      const { data: policy } = await api.get("/settings/admissions");
      const deadline = policy.data.closingDate;
      if (!deadline || deadline < watDate()) {
        setFeedback("Set a current or future submission deadline in Admissions setup before sending a reminder.");
        return;
      }
      const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(new Date(deadline));
      if (!await confirmAction({
        title: "Send application reminder?",
        message: `This sends an email and portal notification asking the applicant to submit by 11:59 pm WAT on ${date}. Check that this is the school’s intended deadline before sending.`,
        confirmLabel: "Send reminder"
      })) return;
      await api.post(`${endpoint}/reminder`);
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

  async function saveClearance(status, note) {
    if (saving) return;
    setSaving(true);
    setFeedback("");
    try {
      const { data } = await api.patch(`/applications/${selectedApplication.id}/clearance`, { status, note });
      await openApplication(selectedApplication.id);
      setFeedback(data.message);
      nextAction.current?.focus();
    } catch (error) { setFeedback(apiErrorMessage(error, "Clearance could not be updated.")); }
    finally { setSaving(false); }
  }

  function dialogKeyDown(event) {
    if (event.target.closest("dialog[open]")) return;
    if (event.key === "Escape" && !saving) setSelectedApplication(null);
    if (event.key !== "Tab") return;
    const focusable = [...dialog.current.querySelectorAll('button:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]')].filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
  }

  const visibleApplications = applications.filter((application) => (filter === "all" || application.notificationAudience === filter || (filter === "waiting" && !application.reviewReady && !application.notificationAudience)) && matchesDirectorySearch(search, application.fullName, application.email, application.applicationNumber, application.courseOfInterest, applicationStatusLabel(application)));
  async function deleteApplicantAccount(event) {
    event.preventDefault();
    if (saving || !selectedApplication?.applicant) return;
    const confirmation = String(new FormData(event.currentTarget).get("confirmation") || "").trim();
    if (confirmation.toLowerCase() !== selectedApplication.applicant.email.toLowerCase()) {
      setFeedback("Enter the exact account email to confirm deletion.");
      return;
    }
    if (!await confirmAction({ title: "Delete applicant login?", message: "The applicant will lose access to this application. Application and payment records will be retained. This action cannot be undone.", confirmLabel: "Delete login", danger: true })) return;
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
  const canReview = user?.role === "ADMIN" || user?.permissions?.includes("applications.review");
  const canAdmit = user?.role === "ADMIN" || user?.permissions?.includes("applications.admit");
  const allowedStatuses = selectedApplication?.allowedStatuses || [];
  const nextStep = selectedApplication ? applicationNextStep(selectedApplication, allowedStatuses, canAdmit) : null;
  const screeningLink = selectedApplication && portalPath("/admin/screening") + "?" + new URLSearchParams({ tab: selectedApplication.status === "INTERVIEW_SCHEDULED" ? "invited" : "awaiting", search: selectedApplication.applicationNumber || selectedApplication.fullName });
  const canRemind = selectedApplication?.applicant?.isActive && selectedApplication.applicant.role === "APPLICANT" && !selectedApplication.submittedAt && ["DRAFT", "PENDING"].includes(selectedApplication.status) && (user?.role === "ADMIN" || user?.permissions?.includes("applications.review"));
  const notification = selectedApplication?.statusHistory?.find((event) => event.emailStatus !== "NOT_REQUIRED" && event.emailRecipient);

  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Admissions office</span><h1>Applications</h1><p>Review submitted applications and keep applicants informed.</p></header>
    <AdminDirectorySearch label="Search applications" placeholder="Name, email, application ID, programme or status" value={search} onChange={setSearch} />
    {!selectedApplication && feedback && <p className="admin-feedback" role="status">{feedback}</p>}
    <div className="review-filters" role="group" aria-label="Application queue">{Object.entries(queues).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {canReview && filter !== "all" && <ApplicationBulkNotice key={filter} audience={filter} label={queues[filter]} />}
    {canReview && canAdmit && filter === "offered" && <BulkFinalAdmission key={search} applications={visibleApplications} refresh={loadApplications} />}
    <div className="admin-table-card"><div className="admin-table-wrap"><table className="review-queue">
      <thead><tr><th>Applicant</th><th>Programme</th><th>Submitted</th><th>Status / review</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan="4">Loading applications…</td></tr> : visibleApplications.length ? visibleApplications.map((application) => <tr key={application.id}>
        <td data-label="Applicant"><strong>{application.fullName}</strong><small>{application.applicationNumber || application.email}</small></td>
        <td data-label="Programme">{application.courseOfInterest || "Not submitted"}</td><td data-label="Submitted">{formatDate(application.submittedAt)}</td>
        <td><button className={`review-status-button status-chip--${application.status.toLowerCase()}`} type="button" onClick={() => openApplication(application.id)} aria-label={`View status for ${application.fullName}`}><span>{applicationStatusLabel(application)}</span>{application.status === "SUBMITTED" && <small>New</small>}<span aria-hidden="true">→</span></button></td>
      </tr>) : <tr><td colSpan="4">{search.trim() ? "No applications in this queue match your search." : filter === "submitted" ? "No submitted applications are ready for review." : "No applicants in this queue."}</td></tr>}</tbody>
    </table></div></div>
    {selectedApplication && <div className="application-review-backdrop">
      <section ref={dialog} tabIndex={-1} onKeyDown={dialogKeyDown} className="application-review-panel" role="dialog" aria-modal="true" aria-labelledby="application-review-title">
        <header className="application-review-panel__header"><div><span className="eyebrow">Application status</span><h2 id="application-review-title">{selectedApplication.fullName}</h2><p>{selectedApplication.applicationNumber}</p></div><button className="icon-button" type="button" disabled={saving} onClick={() => setSelectedApplication(null)} aria-label="Close application"><X size={20} /></button></header>
        <div className="application-review-panel__content">
          <section className="review-status-card"><span className="eyebrow">Current status</span><h3>{applicationStatusLabel(selectedApplication)}</h3><p>{ready ? `Submitted ${formatDate(selectedApplication.submittedAt)}. Review the form and documents below before updating the status.` : selectedApplication.status === "RETURNED" ? "Waiting for the applicant to correct and resubmit their form." : selectedApplication.paymentConfirmed ? "Payment confirmed. The applicant has not submitted their form for review yet." : "Waiting for successful payment and a submitted application. No form is available for review yet."}</p>
            {canRemind && <div>
              <button className="button primary" type="button" disabled={saving} onClick={sendReminder}><Bell size={18} aria-hidden="true" />Send application reminder</button>
              <p>Review or change the <Link to={portalPath("/admin/settings") + "#admissions-availability"}>application submission deadline</Link> before sending.</p>
            </div>}
            {!ready && selectedApplication.reviewNote && <p>{selectedApplication.reviewNote}</p>}
            {feedback && <p className="admin-feedback" role="status">{feedback}</p>}
            {nextStep && <section ref={nextAction} tabIndex={-1} className="application-next-action" aria-label="Next action">
              <h4>Next step</h4>
              <p>{nextStep.message}</p>
              {nextStep.status && canReview && <button type="button" className="button primary" disabled={saving} onClick={() => updateApplicationStatus(nextStep.status)}>{nextStep.label}<ArrowRight size={20} aria-hidden="true" /></button>}
              {nextStep.screening && <Link className="button primary" to={screeningLink}>{selectedApplication.status === "INTERVIEW_SCHEDULED" ? "Open screening record" : "Schedule screening"}</Link>}
              {nextStep.documents && <button type="button" className="button primary" onClick={() => { if (documentsPanel.current) { documentsPanel.current.open = true; documentsPanel.current.querySelector("summary")?.focus(); } }}>Review supporting documents</button>}
              {nextStep.settings && <Link className="button primary" to={portalPath("/admin/settings") + "#admission-letter-settings"}>Complete admission letter settings</Link>}
              {nextStep.clearance && <button type="button" className="button primary" disabled={saving} onClick={() => saveClearance("CLEARED", "")}>Complete clearance</button>}
            </section>}
            {ready && canReview && (allowedStatuses.includes("RETURNED") || allowedStatuses.includes("REJECTED")) && <div className="application-exceptions">
              <div className="application-exception-buttons">
                {allowedStatuses.includes("RETURNED") && <button type="button" className="button secondary" disabled={saving} onClick={() => updateApplicationStatus("RETURNED")}>Request corrections</button>}
                {allowedStatuses.includes("REJECTED") && <button ref={rejectButton} type="button" className="button danger-button" aria-expanded={rejecting} aria-controls={rejecting ? "application-rejection" : undefined} disabled={saving} onClick={() => setRejecting((current) => !current)}>Reject application</button>}
              </div>
              {rejecting && allowedStatuses.includes("REJECTED") && <form id="application-rejection" className="application-review-form" onSubmit={(event) => { event.preventDefault(); updateApplicationStatus("REJECTED", new FormData(event.currentTarget).get("reviewNote")); }}>
                <label>Reason for rejection<textarea name="reviewNote" rows={3} maxLength={2000} required placeholder="Explain why the applicant is disqualified." disabled={saving} /></label>
                <div className="application-exception-buttons">
                  <button type="button" className="button secondary" disabled={saving} onClick={() => { setRejecting(false); rejectButton.current?.focus(); }}>Cancel</button>
                  <button type="submit" className="button danger-button" disabled={saving}>Confirm rejection</button>
                </div>
              </form>}
            </div>}
            {selectedApplication.acceptancePaymentRecorded && <p>To withdraw this offer, resolve the recorded acceptance payment with Admissions first.</p>}
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
            {selectedApplication.status === "ACCEPTED" && canAdmit && selectedApplication.admission?.paid && selectedApplication.admission.response === "ACCEPTED" && selectedApplication.clearanceStatus !== "CLEARED" && <form className="application-review-form" onSubmit={(event) => { event.preventDefault(); saveClearance("CORRECTIONS_REQUIRED", new FormData(event.currentTarget).get("note")); }}><label>Clearance corrections<textarea name="note" rows={3} minLength={5} maxLength={2000} required defaultValue={selectedApplication.clearanceNote || ""} disabled={saving} /></label><button type="submit" className="button secondary" disabled={saving}>Request clearance corrections</button></form>}
          </details>}
          {ready && <>
            <ScreeningReview application={selectedApplication} />
            <details className="review-disclosure"><summary>View submitted application</summary><ApplicationRecord application={selectedApplication} /></details>
            <details ref={documentsPanel} className="review-disclosure"><summary>Review supporting documents</summary>
              {canReview && selectedApplication.status !== "ADMITTED" && selectedApplication.documents?.length > 0 && <button className="button secondary" type="button" disabled={saving} onClick={verifyAllDocuments}>Verify all reviewed documents</button>}
              <div className="supporting-documents">
                {selectedApplication.documents?.length ? selectedApplication.documents.map((document) => <article key={document.id} className="supporting-document">
                  <div className="supporting-document-info"><strong>{readableStatus(document.type)}</strong><PrivateFilePreview path={document.path} label={readableStatus(document.type)} buttonText="View document" allowDownload /></div>
                  <label className="supporting-document-status">Document status<select disabled={saving || selectedApplication.status === "ADMITTED"} value={document.reviewStatus} onChange={(event) => updateDocument(document.id, event.target.value)}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Corrections required</option></select></label>
                </article>) : <p>No supporting documents supplied.</p>}
              </div>
            </details>
          </>}
          {(user?.role === "ADMIN" || user?.permissions?.includes("users.manage")) && selectedApplication.applicant && <details className="review-disclosure"><summary>Account recovery</summary><SendPasswordReset key={selectedApplication.id} applicationId={selectedApplication.id} /></details>}
          {(ready || selectedApplication.payments?.some((payment) => payment.status === "VERIFIED")) && <details className="review-disclosure"><summary>Downloads and payment receipts</summary><ApplicationDownloads application={selectedApplication} /></details>}
          {(ready || notification) && <details className="review-disclosure"><summary>Status history and email notifications</summary>
            <p>{notification?.emailStatus === "SENT" ? "Latest notification accepted by the email provider." : selectedApplication.emailConfigured ? "Notifications are queued or awaiting retry." : "Email sending is not configured. Status updates are still visible in the applicant portal."}</p>
            {notification && notification.emailStatus !== "SENT" && <button type="button" className="button secondary" disabled={saving || !selectedApplication.emailConfigured} onClick={retryEmail}>Retry email notification</button>}
            <ol className="review-history">{selectedApplication.statusHistory?.map((event) => <li key={event.id}><strong>{event.kind?.startsWith("BULK_") ? event.notificationSubject : event.kind === "SCREENING_RESULT" ? event.notificationSubject || "Screening result published" : event.kind === "APPLICATION_REMINDER" ? "Application reminder" : event.kind === "SCREENING_APPROVAL" ? "Accepted for screening" : readableStatus(event.toStatus)}</strong><span>{formatDate(event.createdAt)}</span>{event.note && <p>{event.note}</p>}</li>)}</ol>
          </details>}
          {credentials && <div className="admission-credentials"><strong>Student account assigned</strong><span>Username: {credentials.portalUsername}</span><small>The student can use the same email and password in both portals. No separate password is issued.</small></div>}
        </div>
      </section>
    </div>}
  </div>;
}
