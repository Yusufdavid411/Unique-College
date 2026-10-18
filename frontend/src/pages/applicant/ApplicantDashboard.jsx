import { ArrowRight, CheckCircle2, Circle, Clock3, CreditCard, FileCheck2, FileText, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useApplicant } from "../../context/ApplicantContext.jsx";

const statusText = {
  DRAFT: "Draft",
  RETURNED: "Action required",
  SUBMITTED: "Submitted",
  PENDING: "Pending review",
  REVIEWED: "Reviewed",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  ACCEPTED: "Offer issued",
  ADMITTED: "Admitted",
  REJECTED: "Not selected"
};

export default function ApplicantDashboard() {
  const { application, loading, error } = useApplicant();
  if (loading) return <div className="portal-loading">Loading your admission record...</div>;
  if (!application) return <div className="portal-error">{error || "Applicant record not found."}</div>;

  const documents = application.documents || [];
  const verifiedPayments = (application.payments || []).filter((payment) => payment.status === "VERIFIED");
  const formComplete = Boolean(application.declarationAccepted && application.courseOfInterest && application.educationRecords?.length >= 5);
  const documentsComplete = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].every((type) => documents.some((item) => item.type === type));
  const submitted = !["DRAFT", "RETURNED"].includes(application.status);
  const progressItems = [formComplete, documentsComplete, submitted];
  const progress = Math.round((progressItems.filter(Boolean).length / progressItems.length) * 100);

  return (
    <div className="portal-page">
      <header className="portal-welcome">
        <div><span className="eyebrow">Applicant dashboard</span><h1>Welcome, {application.firstName || application.fullName?.split(" ")[0]}</h1><p>Application ID: <strong>{application.applicationNumber}</strong></p></div>
        <span className={`portal-status ${application.status.toLowerCase()}`}>{statusText[application.status] || application.status}</span>
      </header>

      {error && <p className="form-status error">{error}</p>}
      {application.reviewNote && <div className="portal-alert"><strong>Admissions note</strong><p>{application.reviewNote}</p></div>}

      <section className="portal-progress-card">
        <div><span>Application readiness</span><strong>{progress}%</strong></div>
        <div className="portal-progress"><span style={{ width: `${progress}%` }} /></div>
        <p>Complete your form and required uploads before final submission.</p>
      </section>

      <section className="portal-card-grid">
        <article><span className="portal-card-icon"><FileText /></span><div><h2>Application form</h2><p>{formComplete ? "Your required form information is complete." : "Complete personal, education, sponsor, and declaration details."}</p></div><Link to="/applicant/application">Open form <ArrowRight size={16} /></Link></article>
        <article><span className="portal-card-icon"><FileCheck2 /></span><div><h2>Documents</h2><p>{documents.length} uploaded document{documents.length === 1 ? "" : "s"}. {documentsComplete ? "Required files are present." : "More required files are needed."}</p></div><Link to="/applicant/documents">Manage files <ArrowRight size={16} /></Link></article>
        <article><span className="portal-card-icon"><CreditCard /></span><div><h2>Payments</h2><p>{verifiedPayments.length} verified payment{verifiedPayments.length === 1 ? "" : "s"}. Upload payment evidence for bursary review.</p></div><Link to="/applicant/payments">View payments <ArrowRight size={16} /></Link></article>
      </section>

      <section className="portal-timeline-card">
        <div className="section-heading"><span className="eyebrow">Admission progress</span><h2>Your journey</h2></div>
        <div className="portal-timeline">
          {[
            [true, "Account created", "Your secure applicant profile is active."],
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
        <div className="portal-highlight success"><GraduationCap /><div><strong>Congratulations, you are admitted.</strong><span>Student number: {application.studentNumber}</span></div><Link to="/applicant/print">Open print centre</Link></div>
      )}
    </div>
  );
}
