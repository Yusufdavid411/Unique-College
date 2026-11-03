import { Link } from "react-router-dom";
import { useApplicant } from "../context/ApplicantContext.jsx";
import { portalPath } from "../api/portalLinks.js";
export default function ScreeningProgress() {
  const { application, journey, screening } = useApplicant();
  if (!screening || screening.status === "EXEMPT") return null;
  const awaitingSchedule = screening.status === "NOT_SCHEDULED" || (screening.status === "SCHEDULED" && !screening.date);
  if (awaitingSchedule) {
    if (!journey?.submitted || !["SUBMITTED", "PENDING", "REVIEWED", "INTERVIEW_SCHEDULED"].includes(application?.status)) return null;
    if (!screening.eligible) return null;
    return <section className="review-status-card screening-dashboard-card"><span className="eyebrow">Entrance exam / screening</span>{screening.paid ? <><h2>Ready to be scheduled</h2><p>Your screening fee is confirmed. Your exam date, venue and instructions will appear here once admissions schedules your exam.</p></> : <><h2>Pay your screening fee</h2><p>Your application is ready for the screening payment. Pay ₦{Number(screening.amount).toLocaleString("en-NG")} to qualify for an exam date.</p><Link className="button primary" to={portalPath("/applicant/payments")}>Go to payment</Link></>}</section>;
  }
  return <section className="review-status-card admission-offer"><span className="eyebrow">Entrance exam / screening</span><h2>{screening.status === "PASSED" ? "Screening successful" : screening.status === "FAILED" ? "Screening result available" : "You’re invited to the entrance exam"}</h2>{screening.status === "SCHEDULED" ? <><p>You’re eligible for screening. Prepare for your exam and follow the instructions below.</p><p><strong>{new Date(screening.date).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" })} (WAT)</strong></p><p>Venue: {screening.venue}</p>{screening.instructions && <p>{screening.instructions}</p>}<p>Screening fee: ₦{Number(screening.amount).toLocaleString("en-NG")} · {screening.paid ? "Confirmed" : "Awaiting payment"}</p>{!screening.paid && <Link className="button" to={portalPath("/applicant/payments")}>Pay screening fee</Link>}</> : <p>{screening.status === "PASSED" ? "You have passed the entrance exam/screening. The admissions office will confirm your admission offer separately. Check your portal and email for the next step." : "Please contact the admissions office for guidance on your screening result."}</p>}</section>;
}
