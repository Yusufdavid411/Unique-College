import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { ErrorToast } from "./ToastNotifications.jsx";
import { notify } from "../api/notifications.js";
import PrivateFileButton from "./PrivateFileButton.jsx";
import { fillLetterExamples } from "../data/admissionsExamples.js";
const dates = [["effectiveDate", "Admission effective date"], ["registrationOpen", "Registration/payment opens"], ["registrationDeadline", "Registration deadline"], ["resultDeadline", "O-level result deadline"], ["lecturesStart", "Lectures begin"]];
const messages = [["screeningMessage", "Screening invitation"], ["passedMessage", "Successful screening"], ["failedMessage", "Unsuccessful screening"], ["offerMessage", "Admission offer ready"]];
export default function AdmissionsDocumentsSettings() {
  const { hash } = useLocation();
  const [value, setValue] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); api.get("/settings/admissions-documents", { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setValue(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }); return () => controller.abort(); }, [revision]);
  const change = (key, entry) => setValue((current) => ({ ...current, documents: { ...current.documents, [key]: entry } }));
  const ready = Boolean(value);
  useEffect(() => {
    if (!ready || hash !== "#admission-letter-settings") return;
    const letters = document.getElementById("admission-letter-settings");
    if (!letters) return;
    document.getElementById("admission-document-settings").open = true;
    letters.open = true;
    letters.querySelector("summary")?.focus();
  }, [hash, ready]);
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { const { data } = await api.put("/settings/admissions-documents", value); setValue(data.data); notify({ title: "Admissions document settings saved", message: data.message, type: "info" }); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <details className="settings-panel" id="admission-document-settings">
    <summary>Screening, messages & admission letters</summary><ErrorToast message={error} />
    {!value ? <div className="form-panel"><p>{error ? "Settings could not load." : "Loading…"}</p>{error && <button type="button" className="button" onClick={() => setRevision((entry) => entry + 1)}>Try again</button>}</div> : <form className="form-panel" onSubmit={save}>
      <h2>Screening fee</h2><label>Screening / entrance-exam fee (NGN)<input required type="number" min={0} max={10000000} step="0.01" disabled={busy} value={value.amount ?? ""} onChange={(event) => setValue({ ...value, amount: event.target.value === "" ? null : Number(event.target.value) })} /></label>
      <p>New invitations use this fee. Existing quotes remain unchanged.</p>
      <details id="admission-letter-settings"><summary tabIndex={-1}>Admission-letter details</summary>
        <p>These details appear on new admission letters. Update the session, dates and programme duration here; issued letters keep their original details.</p>
        <button type="button" className="button secondary" disabled={busy} onClick={() => setValue((current) => ({ ...current, documents: fillLetterExamples(current.documents) }))}>Fill blank fields</button>
        <div className="settings-field-grid">
          <label>Academic session<input required value={value.documents.session} maxLength={50} disabled={busy} onChange={(event) => change("session", event.target.value)} /></label>
          <label>Default programme duration<input required value={value.documents.duration} maxLength={80} disabled={busy} onChange={(event) => change("duration", event.target.value)} /></label>
          {dates.map(([key, label]) => <label key={key}>{label}<input required type="date" value={value.documents[key]} disabled={busy} onChange={(event) => change(key, event.target.value)} /></label>)}
        </div>
        <details><summary>Optional fee-schedule appendix</summary>
          <PrivateFileButton endpoint="/settings/admissions-documents/fee-schedule" filename="school-fee-schedule-for-review.pdf">Review fee-schedule appendix</PrivateFileButton>
          <label className="check-field"><input type="checkbox" disabled={busy} checked={value.documents.feeScheduleApproved} onChange={(event) => change("feeScheduleApproved", event.target.checked)} />Attach the registrar-approved fee schedule to admission letters.</label>
          <p>Leave unchecked to issue letters without the appendix. This does not block admission or create payment charges.</p>
        </details>
      </details>
      <details><summary>Portal and email messages</summary><p>Available placeholders: {"{date}, {venue}, {instructions}, {programme}"}.</p>{messages.map(([key, label]) => <label key={key}>{label}<textarea rows={4} minLength={10} maxLength={1500} required disabled={busy} value={value.documents[key]} onChange={(event) => change(key, event.target.value)} /></label>)}</details>
      <div><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save screening and document settings"}</button></div>
    </form>}
  </details>;
}
