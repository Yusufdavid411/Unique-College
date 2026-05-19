import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Seo from "../../components/Seo.jsx";

export default function Admission() {
  const steps = ["Review programme requirements", "Complete the online application form", "Upload a clear passport photograph", "Track status as the admin team reviews your application"];
  return (
    <>
      <Seo title="Admission" description="Admission requirements and application process for Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">Admission</span>
        <h1>A clear application process for future healthcare professionals.</h1>
      </section>
      <section className="section split-section">
        <div>
          <h2>Entry requirements</h2>
          <p>Applicants should hold relevant O-Level credits including English, Mathematics, Biology, Chemistry, and Physics where required by the selected programme.</p>
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
