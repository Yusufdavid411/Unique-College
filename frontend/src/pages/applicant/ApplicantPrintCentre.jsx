import { GraduationCap, Printer } from "lucide-react";
import { useState } from "react";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { assetPaths, schoolInfo } from "../../data/siteData.js";
import ApplicationRecord from "../../components/ApplicationRecord.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";

function PrintHeader() {
  return <header className="print-header"><img src={assetPaths.logo} alt="" /><div><strong>{schoolInfo.name}</strong><span>{schoolInfo.address}</span><span>{schoolInfo.email} · {schoolInfo.phoneDisplay}</span></div></header>;
}

export default function ApplicantPrintCentre() {
  const { application, formAccess, loading } = useApplicant();
  const [printing, setPrinting] = useState("");
  if (loading) return <div className="portal-loading">Preparing print centre...</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;
  if (!formAccess.unlocked) return <FormPurchaseRequired amount={formAccess.amount} />;

  function print(section) {
    setPrinting(section);
    window.setTimeout(() => {
      window.print();
      setPrinting("");
    }, 100);
  }


  return (
    <div className={`portal-page print-centre ${printing ? "is-printing" : ""}`} data-print-target={printing}>
      <header className="portal-page-header no-print"><div><span className="eyebrow">Download and print</span><h1>Print centre</h1><p>Download each PDF separately, then open it to print. The application uses the school's original form.</p></div></header>
      <ApplicationDownloads application={application} />
      {["ACCEPTED", "ADMITTED"].includes(application.status) && <details className="no-print"><summary>Preview accepted application details</summary><ApplicationRecord application={application} /></details>}

      {application.status === "ADMITTED" && <section className={`print-document admission-copy ${printing === "admission" ? "print-target" : ""}`}>
        <PrintHeader />
        {application.isTest && <h2>TEST ADMISSION — NOT VALID FOR ENROLMENT</h2>}
        <div className="print-document-title"><GraduationCap /><div><span>Admission record</span><h2>Provisional Admission Notice</h2></div><button className="no-print" type="button" onClick={() => print("admission")}><Printer />Print / Save PDF</button></div>
        <p>Dear <strong>{application.fullName}</strong>,</p><p>Following the review of your application and supporting credentials, you have been admitted to study <strong>{application.courseOfInterest}</strong> at Unique College of Health Science and Technology.</p><div className="admission-credentials"><span>Student number<strong>{application.studentNumber}</strong></span><span>Official portal email<strong>{application.applicant?.officialEmail || "Issued by administration"}</strong></span></div><p>This notice is an institutional admission record. Complete all required acceptance, clearance, and fee steps communicated by the college.</p><footer>Admissions Office · {application.admittedAt ? new Date(application.admittedAt).toLocaleDateString() : new Date().toLocaleDateString()}</footer>
      </section>}
    </div>
  );
}
