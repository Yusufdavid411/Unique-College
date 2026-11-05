import { useState } from "react";
import { Bell } from "lucide-react";
import { api, apiErrorMessage } from "../api/client.js";
import { useConfirmation } from "../context/ConfirmationContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";
import { notify } from "../api/notifications.js";

export default function ApplicationBulkNotice({ audience, label }) {
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const confirm = useConfirmation();
  const deadline = preview?.closingDate && new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(new Date(preview.closingDate));

  async function loadPreview() {
    setBusy(true);
    setFeedback("");
    setPreview(null);
    try {
      const { data } = await api.get("/applications/bulk-notifications", { params: { audience }, notifyOnError: false });
      if (!data.data.recipients.length) {
        notify({ title: "No reminders to send", message: data.data.recentlyNotified ? "This group has already received a reminder within the last 24 hours." : "No applicants currently need this reminder.", type: "info" });
        return;
      }
      setPreview(data.data);
      if (data.data.recentlyNotified) notify({ title: "Recent recipients skipped", message: `${data.data.recentlyNotified} already received this reminder within the last 24 hours.`, type: "info" });
      setMessage(data.data.message);
    } catch (error) { setFeedback(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function send(event) {
    event.preventDefault();
    if (busy || !preview?.recipients.length) return;
    setBusy(true);
    setFeedback("");
    try {
      const count = preview.recipients.length;
      if (!await confirm({ title: "Send group notification?", message: `Send to ${count} applicant${count === 1 ? "" : "s"} in ${label}? This does not change application statuses.`, confirmLabel: "Send notification" })) return;
      const { data } = await api.post("/applications/bulk-notifications", { audience, ids: preview.recipients.map(({ id }) => id), closingDate: preview.closingDate, ...(deadline ? {} : { message }) }, { timeout: 60000, notifyOnError: false });
      setPreview(null);
      notify({ title: "Reminders sent", message: `${data.data.notified} applicant(s) notified in their portal and submitted for email delivery.`, type: "info" });
    } catch (error) { setFeedback(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <section className="form-panel" aria-label="Group notifications">
    {!preview && <div><button className="button secondary" type="button" disabled={busy} onClick={loadPreview}><Bell size={18} aria-hidden="true" />{busy ? "Checking recipients…" : audience === "waiting" ? "Remind to complete application" : audience === "corrections" ? "Remind to complete corrections" : "Remind about admission offer"}</button></div>}
    <ErrorToast message={feedback} />
    {preview && <form className="student-form" onSubmit={send}>
      <strong>{preview.recipients.length} eligible · {label}</strong>
      <small>Applies to the full group, not just search results. Portal notifications appear immediately; email delivery may follow later.</small>
      {preview.recipients.length > 0 && <>
        <details><summary>Review recipients</summary><ul className="bulk-notice-recipients">{preview.recipients.map(({ id, fullName }) => <li key={id}>{fullName}</li>)}</ul></details>
        <strong>{preview.subject}</strong>
        {deadline ? <p>Submit your application by 11:59 pm WAT on {deadline}. {message}</p> : <label>Message<textarea rows={3} required maxLength={1500} value={message} disabled={busy} onChange={(event) => setMessage(event.target.value)} /></label>}
      </>}
      <div className="review-filters">
        <button type="button" className="button secondary" disabled={busy} onClick={() => setPreview(null)}>Close preview</button>
        {preview.recipients.length > 0 && <button type="submit" className="button primary" disabled={busy || !message.trim()}>{busy ? "Please wait…" : "Send to this group"}</button>}
      </div>
    </form>}
  </section>;
}
