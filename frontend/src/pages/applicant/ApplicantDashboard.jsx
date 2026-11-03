import { ArrowRight, CheckCircle2, Circle, Clock3, CreditCard, FileCheck2, FileText, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { portalPath } from "../../api/portalLinks.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import AdmissionOffer from "../../components/AdmissionOffer.jsx";
import ScreeningProgress from "../../components/ScreeningProgress.jsx";

const statusText = {
  DRAFT: "Draft",
  RETURNED: "Action required",
  SUBMITTED: "Under review",
  PENDING: "Pending review",
  REVIEWED: "Under review",
  INTERVIEW_SCHEDULED: "Entrance exam scheduled",
  ACCEPTED: "Application accepted",
  ADMITTED: "Admitted",
  REJECTED: "Not selected"
};

export default function ApplicantDashboard() {
  const { application, journey, formAccess, loading, error } = useApplicant();
  if (loading) return <div className="portal-loading">Loading your admission record...</div>;
  if (!application || !journey) return <div className="portal-page"><ErrorToast message={error} /><p>Registration progress could not be loaded. Please refresh the page.</p></div>;

  const { formComplete, documentsComplete, submitted } = journey;
  const progressItems = [formAccess.unlocked, formComplete, documentsComplete, submitted];
  const progress = Math.round((progressItems.filter(Boolean).length / progressItems.length) * 100);

  return (
    <div className="portal-page">
      <header className="portal-welcome">
        <div><span className="eyebrow">Applicant dashboard</span><h1>Welcome, {application.firstName || application.fullName?.split(" ")[0]}</h1><p>Application ID: <strong>{application.applicationNumber}</strong></p></div>
        <span className={`portal-status ${application.status.toLowerCase()}`}>{statusText[application.status] || application.status}</span>
      </header>

      <ErrorToast message={error} />
      {application.statusHistory?.some((event) => event.notificationText) && <section className="student-card"><h2>Admissions notifications</h2><details><summary>View updates from admissions</summary>{application.statusHistory.filter((event) => event.notificationText).slice(0, 20).map((event) => <article key={event.id}><h3>{event.notificationSubject}</h3><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}</time><p>{event.notificationText}</p></article>)}</details></section>}
      {["SUBMITTED", "PENDING", "REVIEWED"].includes(application.status) && <section className="review-status-card" role="status"><span className="eyebrow">Application status</span><h2>Under review</h2><p>Your application has been submitted successfully. Please check back later for the admissions decision.</p></section>}
      {application.status === "RETURNED" && <section className="review-status-card" role="status"><h2>Corrections required</h2><p>Read the admissions note, update your form or documents, then submit again from Documents.</p></section>}
      <AdmissionOffer />
      <ScreeningProgress />
      {["DRAFT", "RETURNED"].includes(application.status) && <section className="registration-resume student-next-step"><span className="eyebrow">Your next step</span><h2>{application.status === "RETURNED" ? "Continue your corrections" : "Complete your registration"}</h2><p>{!journey.paid ? "Confirm your application payment to unlock the form." : !formComplete ? "Complete and save your application form, then continue to Documents." : !documentsComplete ? "Your form is saved. Upload the remaining required documents." : "Your form and required documents are ready. Open Documents to check them and submit for review."}</p><Link className="button" to={portalPath(journey.path)}>Complete registration<ArrowRight size={18} /></Link></section>}
      {application.reviewNote && <div className="portal-alert"><strong>Admissions note</strong><p>{application.reviewNote}</p></div>}

      <section className="portal-progress-card">
        <div><span>Application readiness</span><strong>{progress}%</strong></div>
        <div className="portal-progress"><span style={{ width: `${progress}%` }} /></div>
        <p>Complete your form and required uploads before final submission.</p>
      </section>

      <section className="portal-card-grid registration-stage-cards" aria-label="Registration stages">
        {journey.steps.filter((step) => step.id !== "review").map((step) => {
          const Icon = step.id === "payment" ? CreditCard : step.id === "application" ? FileText : FileCheck2;
          const current = !submitted && journey.current === step.id;
          return <article className={current ? "is-current" : step.complete ? "is-complete" : ""} key={step.id} aria-current={current ? "step" : undefined}>
            <span className="portal-card-icon"><Icon /></span>
            <div><span className="registration-stage-status">{step.complete ? "Completed" : current ? "Current stage" : step.locked ? "Not available yet" : "Available"}</span><h2>{step.title}</h2><p>{step.id === "payment" ? step.complete ? "Application payment confirmed. Your receipt is available separately." : "Pay your quoted application fee securely." : step.id === "application" ? step.complete ? "Required form details are saved." : "Complete your personal, education and guardian information." : step.complete ? "Required documents uploaded. Final submission is made here." : "Upload the required credentials after completing your form."}</p></div>
            {step.locked ? <button type="button" className="portal-add-button" disabled>Complete the previous stage first</button> : <Link to={portalPath(step.path)}>{submitted ? "View stage" : step.complete ? "View completed stage" : "Continue"}<ArrowRight size={16} /></Link>}
          </article>;
        })}
      </section>

      <section className="portal-timeline-card">
        <div className="section-heading"><span className="eyebrow">Admission progress</span><h2>Your journey</h2></div>
        <div className="portal-timeline">
          {[
            [true, "Account created", "Your secure applicant profile is active."],
            [formAccess.unlocked, "Payment confirmed", "Successful payment unlocks the application form."],
            [formComplete, "Application completed", "All required form sections are ready."],
            [documentsComplete, "Documents uploaded", "Required credentials have been attached."],
            [submitted, "Submitted for review", "Admissions can vet your information."],
            [application.status === "ADMITTED", "Student access created", "Your student number and portal credentials are available."]
          ].map(([complete, title, text]) => (
            <div className={complete ? "complete" : ""} key={title}>{complete ? <CheckCircle2 /> : <Circle />}<div><strong>{title}</strong><span>{text}</span></div></div>
          ))}
        </div>
      </section>

      {application.status === "INTERVIEW_SCHEDULED" && application.interviewDate && (
        <div className="portal-highlight"><Clock3 /><div><strong>Interview scheduled</strong><span>{new Date(application.interviewDate).toLocaleString()}</span></div></div>
      )}
      {application.status === "ADMITTED" && (
        <div className="portal-highlight success"><GraduationCap /><div><strong>Congratulations, you are admitted.</strong><span>Student number: {application.studentNumber}</span></div><Link to={portalPath("/applicant/print")}>Open print centre</Link></div>
      )}
    </div>
  );
}
