import { Link } from "react-router-dom";
import { useApplicant } from "../context/ApplicantContext.jsx";
import { portalPath } from "../api/portalLinks.js";
export default function ScreeningProgress() {
  const { screening } = useApplicant();
  if (!screening || ["NOT_SCHEDULED", "EXEMPT"].includes(screening.status)) return null;
  return <section className="review-status-card admission-offer"><span className="eyebrow">Entrance exam / screening</span><h2>{screening.status === "PASSED" ? "Screening successful" : screening.status === "FAILED" ? "Screening result available" : "Your exam has been scheduled"}</h2>{screening.status === "SCHEDULED" ? <><p><strong>{new Date(screening.date).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" })} (WAT)</strong></p><p>Venue: {screening.venue}</p>{screening.instructions && <p>{screening.instructions}</p>}<p>Screening fee: ₦{Number(screening.amount).toLocaleString("en-NG")} · {screening.paid ? "Confirmed" : "Awaiting payment"}</p>{!screening.paid && <Link className="button" to={portalPath("/applicant/payments")}>Pay screening fee</Link>}</> : <p>{screening.status === "PASSED" ? "You have passed the entrance exam/screening. The admissions office will confirm your admission offer separately. Check your portal and email for the next step." : "Please contact the admissions office for guidance on your screening result."}</p>}</section>;
}
