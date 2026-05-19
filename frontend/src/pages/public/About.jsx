import Seo from "../../components/Seo.jsx";
import { imagery } from "../../data/siteData.js";

export default function About() {
  return (
    <>
      <Seo title="About" description="Mission, vision, history, accreditation, and leadership of Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">About Unique College</span>
        <h1>Health science education with a modern institutional backbone.</h1>
      </section>
      <section className="section split-section">
        <img src={imagery.students} alt="Healthcare students in academic training" loading="lazy" />
        <div className="stack">
          <article>
            <h2>Mission</h2>
            <p>To train competent, ethical, and technology-aware healthcare professionals through practical teaching, academic discipline, and supportive student services.</p>
          </article>
          <article>
            <h2>Vision</h2>
            <p>To become a leading health science and technology institution recognized for practical excellence, digital readiness, and community impact.</p>
          </article>
        </div>
      </section>
      <section className="section cards-grid">
        <article className="info-card"><h3>History</h3><p>Founded to expand access to applied healthcare education, the college is structured for sustainable growth across academic and administrative systems.</p></article>
        <article className="info-card"><h3>Accreditation</h3><p>Programmes are managed with a compliance-first academic model, ready to document regulatory requirements and institutional approvals.</p></article>
        <article className="info-card"><h3>Leadership</h3><p>The leadership model prioritizes student outcomes, faculty accountability, and transparent administration.</p></article>
      </section>
    </>
  );
}
