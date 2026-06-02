import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { schoolInfo } from "../../data/siteData.js";

export default function Admission() {
  const steps = ["Review the updated 4-semester ND programme options", "Complete every required field on the online application form", "Upload a clear passport photograph", "Watch your email and phone for admission updates if accepted"];
  return (
    <>
      <Seo title="Admission" description="Admission requirements and application process for Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">Admission</span>
        <h1>Admission is open for the {schoolInfo.admissionSession}.</h1>
      </section>
      <section className="section split-section">
        <div>
          <h2>Entry requirements</h2>
          <p>Applicants seeking admission into ND programmes should possess relevant O-Level credits, including English, Mathematics, Biology, Chemistry, Physics, or related science subjects as applicable to the programme.</p>
          <p>Application support is available through the registrar office at {schoolInfo.address}.</p>
          <Link className="button primary" to="/apply">Apply now <ArrowRight size={18} /></Link>
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
