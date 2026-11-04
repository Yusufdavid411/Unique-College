import { useEffect, useRef, useState } from "react";
import { ListChecks, Send, X } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client.js";
import { notify } from "../../api/notifications.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import ScreeningResultForm from "../../components/ScreeningResultForm.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import AdminDirectorySearch, { matchesDirectorySearch } from "../../components/AdminDirectorySearch.jsx";
export default function AdminScreening() {
  const { user } = useAuth();
  const canPublish = user?.role === "ADMIN" || user?.permissions?.includes("applications.admit");
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState([]);
  const [list, setList] = useState("awaiting");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(null);
  const confirmationDialog = useRef(null);
  const [confirmation, setConfirmation] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get("/screening/invitation", { signal: controller.signal }).then(({ data }) => {
      setMessage(data.data.message);
      setEmailConfigured(data.data.emailConfigured);
    }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setSelected([]); setRecords([]); api.get("/applications", { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setRecords(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [revision]);
  const eligible = records.filter((record) => record.applicant?.isActive && record.reviewReady && record.screeningPaid && record.status === "REVIEWED" && record.screeningStatus === "APPROVED");
  const invited = records.filter((record) => ["SCHEDULED", "PASSED", "FAILED"].includes(record.screeningStatus) && record.screeningAt);
  const canReschedule = (record) => record.applicant?.isActive && record.reviewReady && record.screeningPaid && record.status === "INTERVIEW_SCHEDULED" && record.screeningStatus === "SCHEDULED";
  const matches = (record) => matchesDirectorySearch(search, record.fullName, record.email, record.applicationNumber, record.courseOfInterest, record.screeningVenue, { APPROVED: "Awaiting invitation", SCHEDULED: "Scheduled", PASSED: "Passed", FAILED: "Not successful" }[record.screeningStatus]);
  const visibleEligible = eligible.filter(matches);
  const visibleInvited = invited.filter(matches);
  const selectable = list === "awaiting" ? visibleEligible : visibleInvited.filter(canReschedule);
  function reviewSchedule(event) {
    event.preventDefault(); if (busy || !selected.length) return;
    const fields = new FormData(event.currentTarget);
    const date = new Date(`${fields.get("date")}:00+01:00`);
    if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now() + 60000) {
      setError("Choose an exam date and time at least one minute in the future.");
      return;
    }
    const recipients = selectable.filter((record) => selected.includes(record.id));
    if (!recipients.length) return;
    setConfirmation({ recipients, rescheduling: list === "invited", date: date.toISOString(), venue: fields.get("venue").trim(), message: fields.get("message") });
    confirmationDialog.current.showModal();
  }
  async function schedule() {
    if (busy || !confirmation) return;
    const { recipients, date, venue, message: invitationMessage } = confirmation;
    confirmationDialog.current.close();
    setBusy(true); setError("");
    let completed = 0;
    let scheduled = 0;
    let sent = 0;
    let queued = 0;
    let emailConfigured = true;
    try {
      for (let offset = 0; offset < recipients.length; offset += 50) {
        const ids = recipients.slice(offset, offset + 50).map((record) => record.id);
        const { data } = await api.post("/screening/schedule", { ids, date, venue, message: invitationMessage }, { timeout: 120000 });
        completed += ids.length;
        scheduled += data.data.scheduled;
        sent += data.data.submittedToEmailProvider;
        queued += data.data.queuedForDelivery;
        emailConfigured &&= data.data.emailConfigured;
      }
      notify({ title: "Screening invitations saved", message: `${scheduled} scheduled. ${emailConfigured ? `${sent} accepted by the email provider; ${queued} still queued.` : "Email is not configured. Invitations are visible in the portal and queued for email."}`, type: "info" });
      setRevision((value) => value + 1);
    } catch (failure) {
      if (completed) {
        const processed = new Set(recipients.slice(0, completed).map((record) => record.id));
        setSelected((current) => current.filter((id) => !processed.has(id)));
      }
      setError(`${completed ? `${completed} applicants were processed before the error. ` : ""}${apiErrorMessage(failure)}`);
    }
    finally { setBusy(false); }
  }
  return <div className="admin-page">
    <header className="admin-header"><span className="eyebrow">Admissions office</span><h1>Entrance exams & screening</h1><p>Schedule exams, update invitations and publish individual screening results.</p></header>
    <ErrorToast message={error} />
    <AdminDirectorySearch label="Search screening applicants" placeholder="Name, email, application ID, programme, venue or result" value={search} onChange={(value) => { setSearch(value); setSelected([]); }} disabled={busy} />
    <div className="review-filters" role="group" aria-label="Screening applicants">
      <button type="button" aria-pressed={list === "awaiting"} disabled={busy} onClick={() => { setSelected([]); setList("awaiting"); }}>Awaiting invitation ({eligible.length})</button>
      <button type="button" aria-pressed={list === "invited"} disabled={busy} onClick={() => { setSelected([]); setList("invited"); }}>Already invited ({invited.length})</button>
    </div>
    <div className="staff-accounts">
      <section className="form-panel">
        <h2>{list === "awaiting" ? "Select applicants" : "Already invited"}</h2>
        {list === "invited" && <p>Select applicants to change their exam date or venue. Record each result below after the exam. Published results are retained and cannot be replaced by rescheduling.</p>}
        <div className="screening-selection-actions">
          <button type="button" className="button primary" disabled={busy || loading || !selectable.length} onClick={() => setSelected(selectable.map((record) => record.id))}><ListChecks size={18} aria-hidden="true" />{list === "awaiting" ? "Select all eligible applicants" : "Select all for rescheduling"}</button>
          <button type="button" className="button secondary" disabled={busy || !selected.length} onClick={() => setSelected([])}><X size={18} aria-hidden="true" />Clear selection</button>
        </div>
        {loading ? <p>Loading applicants…</p> : list === "awaiting" ? visibleEligible.length ? <div className="screening-selection">{visibleEligible.map((record) => <label className="check-field" key={record.id}>
          <input type="checkbox" checked={selected.includes(record.id)} disabled={busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} />
          <span><strong>{record.fullName}</strong><small>{record.applicationNumber} · Awaiting invitation</small></span>
        </label>)}</div> : <p>{search.trim() ? "No applicants in this tab match your search." : "No applicants are ready for an invitation yet. Applicants appear here after their screening fee is verified."}</p> : visibleInvited.length ? <div className="screening-invited-records">{visibleInvited.map((record) => <article className="screening-invited-card" key={record.id}>
          <label className="check-field">
            <input type="checkbox" checked={selected.includes(record.id)} disabled={busy || !canReschedule(record)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} />
            <span><strong>{record.fullName}</strong><small>{record.applicationNumber}</small><small>{new Date(record.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} (WAT)</small>{record.screeningVenue && <small>{record.screeningVenue}</small>}</span>
          </label>
          {record.screeningStatus === "SCHEDULED" ? canPublish ? <ScreeningResultForm application={record} busy={busy} onBusyChange={setBusy} onSaved={() => setRevision((value) => value + 1)} /> : <p>An authorised admissions officer can publish the result after the exam.</p> : <p className="screening-published-result"><strong>{record.screeningStatus === "PASSED" ? "Passed" : "Not successful"}</strong>{record.entranceExamScore != null && <> · Score: {record.entranceExamScore}%</>}<br />Result published. Admission decisions remain under Applications.</p>}
        </article>)}</div> : <p>{search.trim() ? "No applicants in this tab match your search." : "No applicants have been invited yet."}</p>}
      </section>
      <form className="form-panel" onSubmit={reviewSchedule}>
        <h2>{list === "invited" ? "Reschedule" : "Schedule"} {selected.length ? selected.length + " selected applicant" + (selected.length === 1 ? "" : "s") : "selected applicants"}</h2>
        <div className="settings-field-grid">
          <label>Date and time (Nigeria/WAT)<input name="date" type="datetime-local" required disabled={busy} /></label>
          <label>Venue<input name="venue" required minLength={3} maxLength={250} disabled={busy} /></label>
        </div>
        <details><summary>Edit invitation message (optional)</summary><label>Message to applicants<textarea name="message" rows={5} minLength={10} maxLength={1500} value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy} /></label><p>Each applicant’s name, exam date and time (WAT), venue and school signature are added automatically.</p></details>
        <p>{list === "invited" ? "The updated date and venue replace the current schedule. Each selected applicant receives the updated invitation in their portal and registered email." : "One invitation goes to each selected applicant’s portal notifications and registered email."}</p>
        {emailConfigured === false && <p role="status">Automatic email delivery needs a verified Resend sender. Invitations will still appear in the applicant portal.</p>}
        <div><button className="button primary" type="submit" disabled={busy || !selected.length || !message.trim()}>{busy ? "Sending…" : list === "invited" ? "Reschedule & send invitations" : "Schedule & send invitations"}</button></div>
      </form>
    </div>
    <dialog ref={confirmationDialog} className="private-preview-dialog application-submit-dialog" aria-labelledby="screening-confirm-title">
      <span className="eyebrow">Admissions office</span>
      <h2 id="screening-confirm-title">{confirmation?.rescheduling ? "Confirm screening reschedule" : "Confirm screening invitations"}</h2>
      {confirmation && <>
        <p><strong>Date and time:</strong> {new Date(confirmation.date).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "long", timeStyle: "short" })} (WAT)<br /><strong>Venue:</strong> {confirmation.venue}</p>
        <details open={confirmation.recipients.length <= 5}><summary>{confirmation.recipients.length} selected {confirmation.recipients.length === 1 ? "applicant" : "applicants"}</summary><ul>{confirmation.recipients.map((record) => <li key={record.id}>{record.fullName} · {record.applicationNumber}</li>)}</ul></details>
      </>}
      <form method="dialog" className="document-page-actions"><button className="button secondary" type="submit">Keep editing</button><button className="button primary" type="button" onClick={schedule}><Send size={18} aria-hidden="true" />Send invitations</button></form>
    </dialog>
  </div>;
}
