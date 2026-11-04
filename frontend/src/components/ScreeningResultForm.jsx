import { useEffect, useRef, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { notify } from "../api/notifications.js";
import { ErrorToast } from "./ToastNotifications.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ScreeningResultForm({ application, busy, onBusyChange, onSaved }) {
  const { user } = useAuth();
  const canPublishEarly = user?.role === "ADMIN" || user?.permissions?.includes("screening.results.publish_early");
  const [publishBeforeExam, setPublishBeforeExam] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const dialog = useRef(null);
  const publishing = useRef(false);
  const examAt = new Date(application.screeningAt).getTime();
  const waiting = !Number.isFinite(examAt) || examAt > now;
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);
  function review(event) {
    event.preventDefault();
    if (busy || (waiting && !(canPublishEarly && publishBeforeExam)) || !application.screeningPaid) return;
    const fields = new FormData(event.currentTarget);
    setConfirmation({ outcome: fields.get("outcome"), score: fields.get("score") === "" ? null : Number(fields.get("score")), note: fields.get("note"), ...(waiting && publishBeforeExam ? { publishBeforeExam: true } : {}) });
    dialog.current.showModal();
  }
  async function publish() {
    if (busy || publishing.current || !confirmation) return;
    publishing.current = true;
    dialog.current.close();
    onBusyChange(true);
    setError("");
    try {
      const { data } = await api.patch(`/screening/${application.id}/result`, confirmation);
      notify({ title: "Screening result published", message: data.message, type: "info" });
      onSaved();
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { publishing.current = false; onBusyChange(false); }
  }
  return <details className="screening-result-panel">
    <summary>Record screening result</summary>
    <ErrorToast message={error} />
    <form className="application-review-form" onSubmit={review}>
      {waiting && <p role="status">Scheduled exam: {new Date(application.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} (WAT).{!canPublishEarly && " An authorised administrator can publish an early result."}</p>}
      {waiting && canPublishEarly && <label className="check-field screening-early-choice"><input type="checkbox" checked={publishBeforeExam} disabled={busy} onChange={(event) => setPublishBeforeExam(event.target.checked)} /><span>Publish before exam date</span></label>}
      {!application.screeningPaid && <p role="status">The screening fee must be confirmed before publishing a result.</p>}
      <fieldset disabled={busy || (waiting && !(canPublishEarly && publishBeforeExam)) || !application.screeningPaid}>
        <label>Result<select name="outcome" required defaultValue=""><option value="" disabled>Choose the authorised result</option><option value="PASSED">Passed</option><option value="FAILED">Not successful</option></select></label>
        <label>Score (optional)<input name="score" type="number" min={0} max={100} step="0.01" /></label>
        <label>Result note (optional)<textarea name="note" maxLength={1500} rows={3} /></label>
        <button className="button primary" type="submit">Publish individual result</button>
      </fieldset>
    </form>
    <dialog ref={dialog} className="private-preview-dialog application-submit-dialog" aria-labelledby={`screening-result-${application.id}`}>
      <span className="eyebrow">Admissions office</span>
      <h2 id={`screening-result-${application.id}`}>Confirm screening result</h2>
      <p><strong>{application.fullName}</strong> · {application.applicationNumber}</p>
      {confirmation && <p>Result: <strong>{confirmation.outcome === "PASSED" ? "Passed" : "Not successful"}</strong>{confirmation.score != null && <> · Score: {confirmation.score}%</>}</p>}
      <p>This result will appear in this applicant’s portal and be sent to their registered email.</p>
      {confirmation?.publishBeforeExam && <p role="status"><strong>You are publishing before the scheduled exam date.</strong> This override will be recorded in the audit history.</p>}
      <form method="dialog" className="document-page-actions"><button className="button secondary" type="submit">Keep editing</button><button className="button primary" type="button" disabled={busy} onClick={publish}>Publish result</button></form>
    </dialog>
  </details>;
}
