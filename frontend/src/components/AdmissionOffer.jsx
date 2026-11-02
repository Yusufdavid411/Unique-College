import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath } from "../api/portalLinks.js";
import { useApplicant } from "../context/ApplicantContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";

export default function AdmissionOffer() {
  const { application, admission, refresh } = useApplicant();
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!admission?.offered) return null;
  const admitted = application.status === "ADMITTED";
  const fee = admission.amount == null ? "Being prepared" : `₦${Number(admission.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  async function respond(response) {
    if (operation.current) return;
    if (!window.confirm(response === "ACCEPTED" ? `Accept this offer? Your quoted acceptance fee is ${fee}.` : "Decline this offer? You will need to contact admissions to change your response.")) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try { await api.post("/applicant/offer-response", { response }); await refresh(); }
    catch (failure) { setError(apiErrorMessage(failure, "Your response could not be saved. Refresh before trying again.")); }
    finally { operation.current = false; setBusy(false); }
  }

  return <section className="review-status-card admission-offer" aria-labelledby="admission-offer-title">
    <span className="eyebrow">{admitted ? "Student admission" : "Admission offer"}</span>
    <h2 id="admission-offer-title">{admitted ? "Your admission is confirmed" : admission.response === "DECLINED" ? "Offer declined" : admission.response === "ACCEPTED" ? "Offer accepted" : "You have an admission offer"}</h2>
    <p>{application.courseOfInterest}</p>
    {!admitted && <p><strong>Acceptance fee: {fee}</strong></p>}
    {admission.response === "PENDING" && !admitted && <><p>Accept the offer before paying. Final admission follows payment verification and clearance.</p><div className="portal-form-actions"><button type="button" className="button" disabled={busy || admission.amount == null} onClick={() => respond("ACCEPTED")}>Accept offer</button><button type="button" className="button secondary" disabled={busy || admission.amount == null} onClick={() => respond("DECLINED")}>Decline offer</button></div></>}
    {admission.response === "DECLINED" && <p>Your response is recorded. Contact admissions if you need assistance.</p>}
    {admission.response === "ACCEPTED" && !admitted && <>
      <ol className="admission-checklist"><li>Offer: accepted</li><li>Acceptance fee: {admission.paid ? Number(admission.amount) === 0 ? "not required" : "confirmed" : "awaiting payment"}</li><li>Clearance: {admission.clearanceStatus.toLowerCase().replaceAll("_", " ")}</li><li>Final admission: awaiting admissions decision</li></ol>
      {!admission.paid && <Link className="button" to={portalPath("/applicant/payments")}>Pay acceptance fee</Link>}
      {admission.paid && <Link className="button" to={portalPath("/applicant/school-forms/ACCEPTANCE")}>Complete acceptance form</Link>}
      {admission.clearanceNote && <p><strong>Clearance note:</strong> {admission.clearanceNote}</p>}
      {admission.clearanceStatus === "CORRECTIONS_REQUIRED" && <Link className="button secondary" to={portalPath("/applicant/documents")}>Update clearance documents</Link>}
      <button className="button secondary" type="button" disabled={busy} onClick={refresh}>Refresh status</button>
    </>}
    {admitted && <><p>Student number: <strong>{application.studentNumber}</strong></p><p>Username: <strong>{application.applicant?.portalUsername}</strong></p><p>Keep using your existing login. At your first sign-in after admission, change your password when prompted to activate student access.</p></>}
    <Link to={portalPath("/applicant/print")}>Download application and separate payment receipts</Link>
    <ErrorToast message={error} />
  </section>;
}
