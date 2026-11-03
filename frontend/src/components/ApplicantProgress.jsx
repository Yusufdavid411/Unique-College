import { Check, LockKeyhole } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApplicant } from "../context/ApplicantContext.jsx";
import { portalPath } from "../api/portalLinks.js";

export default function ApplicantProgress() {
  const { application, journey, formAccess, admission, paymentGateway, loading, refresh } = useApplicant();
  const { pathname } = useLocation();
  if (!application || !journey) return null;
  const paid = formAccess.unlocked;
  const pending = application.payments?.some((payment) => payment.type === "APPLICATION_FEE" && payment.status === "PENDING");
  const automatic = paymentGateway.provider === "FLUTTERWAVE";
  const steps = admission?.offered ? [
    { title: "Account", path: "/applicant", complete: true },
    { title: "Offer", path: "/applicant", complete: admission.response === "ACCEPTED" },
    { title: "Acceptance fee", path: "/applicant/payments", locked: admission.response !== "ACCEPTED", complete: admission.paid },
    { title: "Clearance", path: "/applicant", locked: !admission.paid, complete: admission.clearanceStatus === "CLEARED" },
    { title: "Admission", path: "/applicant", locked: admission.clearanceStatus !== "CLEARED", complete: application.status === "ADMITTED" }
  ] : [{ title: "Account", path: "/applicant", complete: true }, ...journey.steps];
  return <section className="applicant-progress no-print" aria-label="Application progress">
    <ol>{steps.map((step, index) => <li key={step.title} className={step.locked ? "is-locked" : step.complete ? "is-complete" : ""}>
      {step.locked ? <button type="button" disabled><span className="applicant-step-number"><LockKeyhole size={15} /></span>{step.title}</button> : <Link to={portalPath(step.path)} aria-current={admission?.offered ? pathname === portalPath(step.path) && index !== 4 ? "step" : undefined : journey.current === step.id ? "step" : undefined}><span className="applicant-step-number">{step.complete ? <Check size={16} /> : index + 1}</span>{step.title}</Link>}
    </li>)}</ol>
    {!paid && <div className="applicant-payment-gate" role="status"><p><strong>{automatic ? "Pay securely with Flutterwave" : pending ? "Payment awaiting admin confirmation" : "Start with your application fee"}</strong><span>{automatic ? "Open Payment to pay or verify an existing transaction. Your form unlocks automatically after confirmation." : pending ? "Evidence received. Next stays locked until an authorised administrator verifies your payment." : "Submit your payment evidence. Your form and documents unlock only after admin verification."}</span></p><button type="button" className="button secondary" disabled={loading} onClick={refresh}>{loading ? "Checking…" : "Refresh access"}</button></div>}
  </section>;
}
