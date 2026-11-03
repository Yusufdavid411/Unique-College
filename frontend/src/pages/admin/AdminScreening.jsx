import { useEffect, useState } from "react";
import { ListChecks, X } from "lucide-react";
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
  useEffect(() => { const controller = new AbortController(); setLoading(true); setSelected([]); setRecords([]); api.get("/applications", { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setRecords(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [revision]);
  const eligible = records.filter((record) => record.applicant?.isActive && record.reviewReady && ["SUBMITTED", "PENDING", "REVIEWED", "INTERVIEW_SCHEDULED"].includes(record.status) && ["NOT_SCHEDULED", "SCHEDULED"].includes(record.screeningStatus));
  async function schedule(event) {
    event.preventDefault(); if (busy || !selected.length) return;
    const fields = new FormData(event.currentTarget);
    const names = eligible.filter((record) => selected.includes(record.id)).map((record) => record.fullName);
    if (!window.confirm(`Schedule these ${names.length} applicants?\n\n${names.join("\n")}\n\nOnly screening invitations will be sent. No admission decisions will be made.`)) return;
    setBusy(true); setError("");
    let completed = 0;
    let scheduled = 0;
    let sent = 0;
    let queued = 0;
    let emailConfigured = true;
    try {
      const date = new Date(`${fields.get("date")}:00+01:00`).toISOString();
      for (let offset = 0; offset < selected.length; offset += 50) {
        const ids = selected.slice(offset, offset + 50);
        const { data } = await api.post("/screening/schedule", { ids, date, venue: fields.get("venue"), instructions: fields.get("instructions") }, { timeout: 120000 });
        completed += ids.length;
        scheduled += data.data.scheduled;
        sent += data.data.submittedToEmailProvider;
        queued += data.data.queuedForDelivery;
        emailConfigured &&= data.data.emailConfigured;
      }
      notify({ title: "Screening invitations saved", message: `${scheduled} scheduled. ${emailConfigured ? `${sent} accepted by the email provider; ${queued} still queued.` : "Email is not configured. Invitations are visible in the portal and queued for email."}`, type: "info" });
      setRevision((value) => value + 1);
    } catch (failure) {
      if (completed) setSelected((current) => current.slice(completed));
      setError(`${completed ? `${completed} applicants were processed before the error. ` : ""}${apiErrorMessage(failure)}`);
    }
    finally { setBusy(false); }
  }
  async function dispatch() {
    if (busy) return; setBusy(true); setError("");
    try { const { data } = await api.post("/screening/dispatch"); notify({ title: "Email delivery queue", message: `${data.data.sent} submitted to the provider in this batch.`, type: "info" }); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><header className="admin-header"><span className="eyebrow">Admissions office</span><h1>Entrance exams & screening</h1><p>Schedule paid, submitted applicants individually or in a selected group. Admission decisions remain individual.</p></header><ErrorToast message={error} /><div className="staff-accounts"><section className="form-panel"><h2>Select applicants</h2><div className="screening-selection-actions"><button type="button" className="button primary" disabled={busy || loading || !eligible.length} onClick={() => setSelected(eligible.map((record) => record.id))}><ListChecks size={18} aria-hidden="true" />Select all eligible applicants</button><button type="button" className="button secondary" disabled={busy || !selected.length} onClick={() => setSelected([])}><X size={18} aria-hidden="true" />Clear selection</button></div>{loading ? <p>Loading applicants…</p> : eligible.length ? <div className="screening-selection">{eligible.map((record) => <label className="check-field" key={record.id}><input type="checkbox" checked={selected.includes(record.id)} disabled={busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /><span><strong>{record.fullName}</strong><small>{record.applicationNumber} · {record.screeningStatus === "SCHEDULED" ? `Scheduled ${new Date(record.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}` : "Awaiting invitation"}</small></span></label>)}</div> : <p>No submitted applicants are currently eligible for scheduling.</p>}</section><form className="form-panel" onSubmit={schedule}><h2>Schedule {selected.length ? `${selected.length} selected applicant${selected.length === 1 ? "" : "s"}` : "selected applicants"}</h2><div className="settings-field-grid"><label>Date and time (Nigeria/WAT)<input name="date" type="datetime-local" required disabled={busy} /></label><label>Venue<input name="venue" required minLength={3} maxLength={250} disabled={busy} /></label></div><label>Instructions<textarea name="instructions" rows={3} maxLength={1500} disabled={busy} /></label><p>The next step shows all selected recipients for confirmation. Portal notifications are saved immediately; email delivery is tracked separately.</p><div><button className="button" type="submit" disabled={busy || !selected.length}>{busy ? "Saving…" : "Review recipients & schedule"}</button></div></form><details className="form-panel"><summary>Email delivery queue</summary><p>For pending or failed notifications, process the next small batch after the school's email sender is configured. Repeated delivery attempts use the same notification identifiers.</p><button type="button" className="button secondary" disabled={busy} onClick={dispatch}>Process pending email batch</button></details></div></div>;
}
