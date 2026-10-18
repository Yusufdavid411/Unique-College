import { FileText, GraduationCap, Printer, ReceiptText } from "lucide-react";
import { useState } from "react";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { assetPaths, schoolInfo } from "../../data/siteData.js";

export default function ApplicantPrintCentre() {
  const { application, loading } = useApplicant();
  const [printing, setPrinting] = useState("");
  if (loading) return <div className="portal-loading">Preparing print centre...</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;

  function print(section) {
    setPrinting(section);
    window.setTimeout(() => {
      window.print();
      setPrinting("");
    }, 100);
  }

  const PrintHeader = () => <header className="print-header"><img src={assetPaths.logo} alt="" /><div><strong>{schoolInfo.name}</strong><span>{schoolInfo.address}</span><span>{schoolInfo.email} · {schoolInfo.phoneDisplay}</span></div></header>;

  return (
    <div className={`portal-page print-centre ${printing ? "is-printing" : ""}`} data-print-target={printing}>
      <header className="portal-page-header no-print"><div><span className="eyebrow">Download and print</span><h1>Print centre</h1><p>Use your browser's print window to print or save each record as a PDF.</p></div></header>

      <section className={`print-document application-copy ${printing === "application" ? "print-target" : ""}`}>
        <PrintHeader />
        <div className="print-document-title"><FileText /><div><span>Official applicant copy</span><h2>Application Form For Admission</h2></div><button className="no-print" type="button" onClick={() => print("application")}><Printer />Print / Save PDF</button></div>
        <div className="print-meta"><span>Application ID<strong>{application.applicationNumber}</strong></span><span>Status<strong>{application.status.replaceAll("_", " ")}</strong></span><span>Date submitted<strong>{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "Not submitted"}</strong></span></div>
        <h3>A. Personal Data</h3><dl className="print-details"><div><dt>Full name</dt><dd>{application.fullName}</dd></div><div><dt>Date of birth</dt><dd>{application.dateOfBirth ? new Date(application.dateOfBirth).toLocaleDateString() : "—"}</dd></div><div><dt>Sex</dt><dd>{application.gender || "—"}</dd></div><div><dt>LGA / State</dt><dd>{application.lga || "—"} / {application.state || "—"}</dd></div><div><dt>Nationality</dt><dd>{application.nationality || "—"}</dd></div><div><dt>Phone</dt><dd>{application.phoneNumber}</dd></div><div><dt>Postal address</dt><dd>{application.postalAddress || "—"}</dd></div><div><dt>Permanent address</dt><dd>{application.permanentAddress || "—"}</dd></div></dl>
        <h3>B. Programme</h3><p>{application.courseOfInterest || "Not selected"}</p>
        <h3>C. Education</h3><table><thead><tr><th>Subject</th><th>Grade</th><th>Exam body</th><th>Year</th></tr></thead><tbody>{application.educationRecords?.map((record, index) => <tr key={index}><td>{record.subject}</td><td>{record.grade}</td><td>{record.examBody}</td><td>{record.year}</td></tr>)}</tbody></table>
        <h3>D. Parent / Guardian</h3><dl className="print-details"><div><dt>Name</dt><dd>{application.guardianName || "—"}</dd></div><div><dt>Relationship</dt><dd>{application.guardianRelationship || "—"}</dd></div><div><dt>Phone</dt><dd>{application.guardianPhone || "—"}</dd></div><div><dt>Address</dt><dd>{application.guardianAddress || "—"}</dd></div></dl>
        <footer>Generated from the Unique College Applicant Portal · {new Date().toLocaleString()}</footer>
      </section>

      <section className={`print-document payment-copy ${printing === "payments" ? "print-target" : ""}`}>
        <PrintHeader />
        <div className="print-document-title"><ReceiptText /><div><span>Applicant payment record</span><h2>Payment Receipts</h2></div><button className="no-print" type="button" onClick={() => print("payments")}><Printer />Print / Save PDF</button></div>
        {!application.payments?.length ? <p>No payments recorded.</p> : <table><thead><tr><th>Payment</th><th>Amount</th><th>Reference</th><th>Status</th><th>Date</th></tr></thead><tbody>{application.payments.map((payment) => <tr key={payment.id}><td>{payment.type.replaceAll("_", " ")}</td><td>NGN {Number(payment.amount).toLocaleString()}</td><td>{payment.reference}</td><td>{payment.status}</td><td>{new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>}
        <footer>Application ID: {application.applicationNumber}</footer>
      </section>

      {application.status === "ADMITTED" && <section className={`print-document admission-copy ${printing === "admission" ? "print-target" : ""}`}>
        <PrintHeader />
        <div className="print-document-title"><GraduationCap /><div><span>Admission record</span><h2>Provisional Admission Notice</h2></div><button className="no-print" type="button" onClick={() => print("admission")}><Printer />Print / Save PDF</button></div>
        <p>Dear <strong>{application.fullName}</strong>,</p><p>Following the review of your application and supporting credentials, you have been admitted to study <strong>{application.courseOfInterest}</strong> at Unique College of Health Science and Technology.</p><div className="admission-credentials"><span>Student number<strong>{application.studentNumber}</strong></span><span>Official portal email<strong>{application.applicant?.officialEmail || "Issued by administration"}</strong></span></div><p>This notice is an institutional admission record. Complete all required acceptance, clearance, and fee steps communicated by the college.</p><footer>Admissions Office · {application.admittedAt ? new Date(application.admittedAt).toLocaleDateString() : new Date().toLocaleDateString()}</footer>
      </section>}
    </div>
  );
}
