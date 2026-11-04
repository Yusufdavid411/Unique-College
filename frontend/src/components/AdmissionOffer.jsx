import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath, studentPortalHref } from "../api/portalLinks.js";
import { useApplicant } from "../context/ApplicantContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";
import { useConfirmation } from "../context/ConfirmationContext.jsx";

export default function AdmissionOffer() {
  const confirmAction = useConfirmation();
  const { application, admission, refresh } = useApplicant();
  const navigate = useNavigate();
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!admission?.offered) return null;
  const admitted = application.status === "ADMITTED";
  const fee = admission.amount == null ? "Being prepared" : `₦${Number(admission.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  async function respond(response) {
    if (operation.current) return;
    if (!await confirmAction({ title: response === "ACCEPTED" ? "Accept your admission offer?" : "Decline your admission offer?", message: response === "ACCEPTED" ? `Your acceptance fee is ${fee}. Continue to confirm your choice and proceed with the required payment.` : "Your offer will be marked as declined. You will need to contact Admissions to change this response.", confirmLabel: response === "ACCEPTED" ? "Accept offer" : "Decline offer", danger: response === "DECLINED" })) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/applicant/offer-response", { response });
      await refresh();
      if (data.data.admission.canPay) navigate(portalPath("/applicant/payments"));
    }
    catch (failure) { setError(apiErrorMessage(failure, "Your response could not be saved. Refresh before trying again.")); }
    finally { operation.current = false; setBusy(false); }
  }

  return <section className="review-status-card admission-offer" aria-labelledby="admission-offer-title">
    <span className="eyebrow">{admitted ? "Student admission" : "Admission offer"}</span>
    <h2 id="admission-offer-title">{admitted ? "Your admission is confirmed" : admission.response === "DECLINED" ? "Offer declined" : admission.response === "ACCEPTED" ? "Offer accepted" : "You have an admission offer"}</h2>
    <p>{application.courseOfInterest}</p>
    {!admitted && <p><strong>Acceptance fee: {fee}</strong></p>}
    {admission.response === "PENDING" && !admitted && <><p>Accept this provisional offer to continue. Final admission follows the required payment, acceptance form and clearance.</p><div className="document-page-actions"><button type="button" className="button primary" disabled={busy || admission.amount == null} onClick={() => respond("ACCEPTED")}>{Number(admission.amount) > 0 ? "Accept offer & continue to payment" : "Accept offer"}</button><button type="button" className="button secondary" disabled={busy || admission.amount == null} onClick={() => respond("DECLINED")}>Decline offer</button></div></>}
    {admission.response === "DECLINED" && <p>Your response is recorded. Contact admissions if you need assistance.</p>}
    {admission.response === "ACCEPTED" && !admitted && <>
      <ol className="admission-checklist"><li>Offer: accepted</li><li>Acceptance fee: {admission.paid ? Number(admission.amount) === 0 ? "not required" : "confirmed" : "awaiting payment"}</li><li>Clearance: {admission.clearanceStatus.toLowerCase().replaceAll("_", " ")}</li><li>Final admission: awaiting admissions decision</li></ol>
      {admission.canPay && <Link className="button primary" to={portalPath("/applicant/payments")}>Pay acceptance fee</Link>}
      {admission.paid && application.requiresAcceptanceForm && !application.schoolForms?.some((form) => form.kind === "ACCEPTANCE" && form.status === "SUBMITTED") && <Link className="button primary" to={portalPath("/applicant/school-forms/ACCEPTANCE")}>Complete acceptance form</Link>}
      {admission.clearanceNote && <p><strong>Clearance note:</strong> {admission.clearanceNote}</p>}
      {admission.clearanceStatus === "CORRECTIONS_REQUIRED" && <Link className="button secondary" to={portalPath("/applicant/documents")}>Update clearance documents</Link>}
      <button className="button secondary" type="button" disabled={busy} onClick={refresh}>Refresh status</button>
    </>}
    {admitted && <><p>Student number: <strong>{application.studentNumber}</strong></p><p>Sign in to the student portal with the same email and password you use here.</p><div className="document-page-actions"><a className="button primary" href={studentPortalHref()}>Sign in to student portal</a></div></>}
    <Link to={portalPath("/applicant/print")}>Download application and separate payment receipts</Link>
    <ErrorToast message={error} />
  </section>;
}
