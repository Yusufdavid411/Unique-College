import { ArrowRight, CheckCircle2, Circle, Clock3, CreditCard, FileCheck2, FileText, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";
import { portalPath } from "../../api/portalLinks.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";

const statusText = {
  DRAFT: "Draft",
  RETURNED: "Action required",
  SUBMITTED: "Under review",
  PENDING: "Pending review",
  REVIEWED: "Under review",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  ACCEPTED: "Application accepted",
  ADMITTED: "Admitted",
  REJECTED: "Not selected"
};

export default function ApplicantDashboard() {
  const { application, formAccess, paymentGateway, loading, error } = useApplicant();
  if (loading) return <div className="portal-loading">Loading your admission record...</div>;
  if (!application) return <div className="portal-error">{error || "Applicant record not found."}</div>;

  const documents = application.documents || [];
  const verifiedPayments = (application.payments || []).filter((payment) => payment.status === "VERIFIED");
  const formComplete = Boolean(application.declarationAccepted && application.courseOfInterest && application.educationRecords?.length >= 5);
  const documentsComplete = ["PASSPORT", "BIRTH_CERTIFICATE", "NATIONAL_ID", "EDUCATIONAL_RESULT"].every((type) => documents.some((item) => item.type === type));
  const submitted = !["DRAFT", "RETURNED"].includes(application.status);
  const progressItems = [formAccess.unlocked, formComplete, documentsComplete, submitted];
  const progress = Math.round((progressItems.filter(Boolean).length / progressItems.length) * 100);

  return (
    <div className="portal-page">
      <header className="portal-welcome">
        <div><span className="eyebrow">Applicant dashboard</span><h1>Welcome, {application.firstName || application.fullName?.split(" ")[0]}</h1><p>Application ID: <strong>{application.applicationNumber}</strong></p></div>
        <span className={`portal-status ${application.status.toLowerCase()}`}>{statusText[application.status] || application.status}</span>
      </header>

      <ErrorToast message={error} />
      {["SUBMITTED", "PENDING", "REVIEWED"].includes(application.status) && <section className="review-status-card" role="status"><span className="eyebrow">Application status</span><h2>Under review</h2><p>Your application has been submitted successfully. Please check back later for the admissions decision.</p></section>}
      {application.status === "RETURNED" && <section className="review-status-card" role="status"><h2>Corrections required</h2><p>Read the admissions note, update your form or documents, then submit again for review.</p><Link className="button" to={portalPath("/applicant/application")}>Correct application</Link></section>}
      {["ACCEPTED", "ADMITTED"].includes(application.status) && <section className="review-status-card" role="status"><h2>Your application has been accepted</h2><p>You can now download your accepted application form. Payment receipts are available separately.</p><Link className="button" to={portalPath("/applicant/print")}>Download records</Link></section>}
      {!formAccess.unlocked && <FormPurchaseRequired amount={formAccess.amount} />}
      {application.reviewNote && <div className="portal-alert"><strong>Admissions note</strong><p>{application.reviewNote}</p></div>}

      <section className="portal-progress-card">
        <div><span>Application readiness</span><strong>{progress}%</strong></div>
        <div className="portal-progress"><span style={{ width: `${progress}%` }} /></div>
        <p>Complete your form and required uploads before final submission.</p>
      </section>

      <section className="portal-card-grid">
        <article><span className="portal-card-icon"><FileText /></span><div><h2>Application form</h2><p>{formComplete ? "Your required form information is complete." : "Complete personal, education, sponsor, and declaration details."}</p></div>{formAccess.unlocked ? <Link to={portalPath("/applicant/application")}>Open form <ArrowRight size={16} /></Link> : <button type="button" className="portal-add-button" disabled>Locked until payment is verified</button>}</article>
        <article><span className="portal-card-icon"><FileCheck2 /></span><div><h2>Documents</h2><p>{documents.length} uploaded document{documents.length === 1 ? "" : "s"}. {documentsComplete ? "Required files are present." : "More required files are needed."}</p></div>{formAccess.unlocked ? <Link to={portalPath("/applicant/documents")}>Manage files <ArrowRight size={16} /></Link> : <button type="button" className="portal-add-button" disabled>Locked until payment is verified</button>}</article>
        <article><span className="portal-card-icon"><CreditCard /></span><div><h2>Payments</h2><p>{verifiedPayments.length} verified payment{verifiedPayments.length === 1 ? "" : "s"}. {paymentGateway.provider === "FLUTTERWAVE" ? "Pay securely online and track automatic confirmation." : "Upload payment evidence for bursary review."}</p></div><Link to={portalPath("/applicant/payments")}>View payments <ArrowRight size={16} /></Link></article>
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
