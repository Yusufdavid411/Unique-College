import { useEffect, useRef, useState } from "react";
import { ListChecks, Send, X } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client.js";
import { notify } from "../../api/notifications.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
export default function AdminScreening() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState([]);
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
  const eligible = records.filter((record) => record.applicant?.isActive && record.reviewReady && record.screeningPaid && ((record.status === "REVIEWED" && record.screeningStatus === "APPROVED") || (record.status === "INTERVIEW_SCHEDULED" && record.screeningStatus === "SCHEDULED")));
  function reviewSchedule(event) {
    event.preventDefault(); if (busy || !selected.length) return;
    const fields = new FormData(event.currentTarget);
    const date = new Date(`${fields.get("date")}:00+01:00`);
    if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now() + 60000) {
      setError("Choose an exam date and time at least one minute in the future.");
      return;
    }
    const recipients = eligible.filter((record) => selected.includes(record.id));
    if (!recipients.length) return;
    setConfirmation({ recipients, date: date.toISOString(), venue: fields.get("venue").trim(), message: fields.get("message") });
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
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Admissions office</span><h1>Entrance exams & screening</h1><p>Schedule applicants after their screening fee is verified. Admission decisions remain individual.</p></header><ErrorToast message={error} /><div className="staff-accounts"><section className="form-panel"><h2>Select applicants</h2><div className="screening-selection-actions"><button type="button" className="button primary" disabled={busy || loading || !eligible.length} onClick={() => setSelected(eligible.map((record) => record.id))}><ListChecks size={18} aria-hidden="true" />Select all eligible applicants</button><button type="button" className="button secondary" disabled={busy || !selected.length} onClick={() => setSelected([])}><X size={18} aria-hidden="true" />Clear selection</button></div>{loading ? <p>Loading applicants…</p> : eligible.length ? <div className="screening-selection">{eligible.map((record) => <label className="check-field" key={record.id}><input type="checkbox" checked={selected.includes(record.id)} disabled={busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /><span><strong>{record.fullName}</strong><small>{record.applicationNumber} · {record.screeningStatus === "SCHEDULED" ? `Scheduled ${new Date(record.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}` : "Awaiting invitation"}</small></span></label>)}</div> : <p>No submitted applicants are currently eligible for scheduling.</p>}</section><form className="form-panel" onSubmit={reviewSchedule}><h2>Schedule {selected.length ? `${selected.length} selected applicant${selected.length === 1 ? "" : "s"}` : "selected applicants"}</h2><div className="settings-field-grid"><label>Date and time (Nigeria/WAT)<input name="date" type="datetime-local" required disabled={busy} /></label><label>Venue<input name="venue" required minLength={3} maxLength={250} disabled={busy} /></label></div><details><summary>Edit invitation message (optional)</summary><label>Message to applicants<textarea name="message" rows={5} minLength={10} maxLength={1500} value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy} /></label><p>Each applicant’s name, exam date and time (WAT), venue and school signature are added automatically.</p></details><p>One invitation goes to each selected applicant’s portal notifications and registered email.</p>{emailConfigured === false && <p role="status">Automatic email delivery needs a verified Resend sender. Invitations will still appear in the applicant portal.</p>}<div><button className="button" type="submit" disabled={busy || !selected.length || !message.trim()}>{busy ? "Sending…" : "Schedule & send invitations"}</button></div></form></div>
    <dialog ref={confirmationDialog} className="private-preview-dialog application-submit-dialog" aria-labelledby="screening-confirm-title">
      <span className="eyebrow">Admissions office</span>
      <h2 id="screening-confirm-title">Confirm screening invitations</h2>
      {confirmation && <>
        <p><strong>Date and time:</strong> {new Date(confirmation.date).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "long", timeStyle: "short" })} (WAT)<br /><strong>Venue:</strong> {confirmation.venue}</p>
        <details open={confirmation.recipients.length <= 5}><summary>{confirmation.recipients.length} selected {confirmation.recipients.length === 1 ? "applicant" : "applicants"}</summary><ul>{confirmation.recipients.map((record) => <li key={record.id}>{record.fullName} · {record.applicationNumber}</li>)}</ul></details>
      </>}
      <form method="dialog" className="document-page-actions">
        <button className="button secondary" type="submit">Keep editing</button>
        <button className="button primary" type="button" onClick={schedule}><Send size={18} aria-hidden="true" />Send invitations</button>
      </form>
    </dialog>
  </div>;
}
