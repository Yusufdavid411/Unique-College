import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath } from "../api/portalLinks.js";
import { notify } from "../api/notifications.js";
import { ErrorToast } from "./ToastNotifications.jsx";
import { useConfirmation } from "../context/ConfirmationContext.jsx";
export default function ScreeningReview({ application, refresh }) {
  const confirmAction = useConfirmation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function release(event) {
    event.preventDefault(); if (busy) return;
    const duration = new FormData(event.currentTarget).get("duration");
    if (!await confirmAction({ title: "Release admission letter?", message: `Release the letter for ${application.fullName}? Confirm the course, dates, duration and approved fee appendix first.`, confirmLabel: "Release letter" })) return;
    setBusy(true); setError("");
    try { const { data } = await api.post(`/records/applications/${application.id}/issue-letter`, duration ? { duration } : {}); notify({ title: "Admission letter released", message: data.message, type: "info" }); await refresh(application.id); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <><details className="review-disclosure"><summary>Entrance exam / screening</summary><p>Status: <strong>{(application.screeningStatus || "NOT_SCHEDULED").toLowerCase().replaceAll("_", " ")}</strong></p>{application.screeningAt && <p>{new Date(application.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} · {application.screeningVenue}</p>}<p>Scheduling, rescheduling and result entry are managed on Screening &amp; exams. After a successful result, return here to review the admission decision.</p><Link className="button secondary" to={portalPath("/admin/screening")}>Go to Screening &amp; exams</Link></details>{["ACCEPTED", "ADMITTED"].includes(application.status) && <details className="review-disclosure"><summary>Admission letter release</summary>{application.admissionLetters?.length ? <p>The letter has been released with its original issue date and details. It is available in Downloads.</p> : <form className="application-review-form" onSubmit={release}><p>Requires verified acceptance payment. Complete session, dates and appendix approval in Settings first.</p><label>Programme duration override (optional)<input name="duration" maxLength={80} disabled={busy} placeholder="Leave blank to use the approved setting" /></label><button type="submit" className="button" disabled={busy}>{busy ? "Preparing…" : "Release admission letter"}</button></form>}</details>}<ErrorToast message={error} /></>;
}
