import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { useSchool } from "../../context/SchoolContext.jsx";
import { useAdmissions } from "../../context/AdmissionsContext.jsx";
import { applicantLoginHref } from "../../api/portalLinks.js";
import ApplyLink from "../../components/ApplyLink.jsx";

export default function Admission() {
  const { schoolInfo } = useSchool();
  const { policy, unavailable } = useAdmissions();
  const steps = ["Review the updated 6-semester ND programme options", "Complete every required field on the online application form", "Upload a clear passport photograph", "Watch your email and phone for admission updates if accepted"];
  return (
    <>
      <Seo title="Admission" description="Admission requirements and application process for Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">Admission</span>
        <h1>{policy ? policy.open ? "Admissions are open" : "Admissions are closed" : unavailable ? "Admissions status unavailable" : "Admissions"}</h1>
        <p>{policy?.message || "Please check back shortly for the current admissions schedule."}</p>
      </section>
      <section className="section split-section">
        <div>
          <h2>Entry Requirements</h2>
          <p>Applicants seeking admission into ND programmes should possess relevant O-Level credits, including English, Mathematics, Biology, Chemistry, Physics, or related science subjects as applicable to the programme.</p>
          <p>Application support is available through the registrar office at {schoolInfo.address}.</p>
          <ApplyLink className="button primary">Apply now <ArrowRight size={18} /></ApplyLink>
          <p><Link to={applicantLoginHref()}>Existing applicant? Sign in to track your application.</Link></p>
        </div>
        <div className="process-list">
          {steps.map((step) => (
            <div key={step}><CheckCircle2 size={20} /><span>{step}</span></div>
          ))}
        </div>
      </section>
    </>
  );
}
