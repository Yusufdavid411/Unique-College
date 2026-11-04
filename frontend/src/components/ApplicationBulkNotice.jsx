import { useState } from "react";
import { Bell } from "lucide-react";
import { api, apiErrorMessage } from "../api/client.js";
import { useConfirmation } from "../context/ConfirmationContext.jsx";

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
      setPreview(data.data);
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
      setFeedback(`${data.data.notified} notified.${data.data.emailPending ? ` ${data.data.emailPending} email deliveries pending.` : ""}`);
    } catch (error) { setFeedback(apiErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <section className="form-panel" aria-label="Group notifications">
    {!preview && <div><button className="button secondary" type="button" disabled={busy} onClick={loadPreview}><Bell size={18} aria-hidden="true" />{busy ? "Checking recipients…" : "Notify this group"}</button></div>}
    {feedback && <p role="status">{feedback}</p>}
    {preview && <form className="student-form" onSubmit={send}>
      <strong>{preview.recipients.length} eligible · {label}</strong>
      <small>Applies to the full group, not just search results. Portal notifications appear immediately; email delivery may follow later.</small>
      {preview.recentlyNotified > 0 && <small>{preview.recentlyNotified} skipped because they received this notification in the last 24 hours.</small>}
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
