import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath } from "../api/portalLinks.js";
import { notify } from "../api/notifications.js";
import { ErrorToast } from "./ToastNotifications.jsx";
export default function ScreeningReview({ application, refresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function result(event) {
    event.preventDefault(); if (busy) return;
    const fields = new FormData(event.currentTarget);
    if (!window.confirm(`Publish ${fields.get("outcome")} for ${application.fullName}? This notifies this applicant, not the whole group.`)) return;
    setBusy(true); setError("");
    try { const { data } = await api.patch(`/screening/${application.id}/result`, { outcome: fields.get("outcome"), score: fields.get("score") === "" ? null : Number(fields.get("score")), note: fields.get("note") }); notify({ title: "Screening result published", message: data.message, type: "info" }); await refresh(application.id); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function release(event) {
    event.preventDefault(); if (busy) return;
    if (!window.confirm(`Release the school admission letter for ${application.fullName}? Check the course, dates, duration and approved fee appendix before proceeding.`)) return;
    const duration = new FormData(event.currentTarget).get("duration");
    setBusy(true); setError("");
    try { const { data } = await api.post(`/records/applications/${application.id}/issue-letter`, duration ? { duration } : {}); notify({ title: "Admission letter released", message: data.message, type: "info" }); await refresh(application.id); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <><details className="review-disclosure" open={application.screeningStatus === "SCHEDULED"}><summary>Entrance exam / screening</summary><p>After the exam, publish the individual result below. If the applicant passes, use Update status to issue an admission offer. Acceptance payment, the acceptance form and clearance come next; final admission then enables student access.</p><p>Status: <strong>{(application.screeningStatus || "NOT_SCHEDULED").toLowerCase().replaceAll("_", " ")}</strong></p>{application.screeningAt && <p>{new Date(application.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} · {application.screeningVenue}</p>}<Link to={portalPath("/admin/screening")}>Schedule this applicant or a selected group</Link>{application.screeningStatus === "SCHEDULED" && <form className="application-review-form" onSubmit={result}><label>Result<select name="outcome" required disabled={busy} defaultValue=""><option value="" disabled>Choose the authorised result</option><option value="PASSED">Passed</option><option value="FAILED">Not successful</option></select></label><label>Score (optional)<input name="score" type="number" min={0} max={100} step="0.01" disabled={busy} /></label><label>Result note<textarea name="note" maxLength={1500} rows={3} disabled={busy} /></label><p>Results can be published only after the scheduled exam and confirmed screening payment. Passing does not automatically issue admission.</p><button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Publish individual result"}</button></form>}</details>{["ACCEPTED", "ADMITTED"].includes(application.status) && <details className="review-disclosure"><summary>Admission letter release</summary>{application.admissionLetters?.length ? <p>The letter has been released with its original issue date and details. It is available in Downloads.</p> : <form className="application-review-form" onSubmit={release}><p>Requires verified acceptance payment. Complete session, dates and appendix approval in Settings first.</p><label>Programme duration override (optional)<input name="duration" maxLength={80} disabled={busy} placeholder="Leave blank to use the approved setting" /></label><button type="submit" className="button" disabled={busy}>{busy ? "Preparing…" : "Release admission letter"}</button></form>}</details>}<ErrorToast message={error} /></>;
}
