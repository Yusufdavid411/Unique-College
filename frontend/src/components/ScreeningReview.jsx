import { Link } from "react-router-dom";
import { portalPath } from "../api/portalLinks.js";

export default function ScreeningReview({ application }) {
  return <details className="review-disclosure">
    <summary>Entrance exam / screening</summary>
    <p>Status: <strong>{(application.screeningStatus || "NOT_SCHEDULED").toLowerCase().replaceAll("_", " ")}</strong></p>
    {application.screeningAt && <p>{new Date(application.screeningAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} · {application.screeningVenue}</p>}
    <p>Manage scheduling and results on Screening &amp; exams.</p>
    <Link className="button secondary" to={portalPath("/admin/screening")}>Go to Screening &amp; exams</Link>
  </details>;
}
