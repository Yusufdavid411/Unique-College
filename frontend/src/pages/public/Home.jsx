import { Link } from "react-router-dom";
import { Activity, ArrowRight, BookOpen, Microscope, ShieldCheck } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { assetPaths, imagery, programs, sampleNews, schoolInfo, stats } from "../../data/siteData.js";

export default function Home() {
  return (
    <>
      <Seo title="Home" description="Unique College of Health Science and Technology official website and admission portal." />
      <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(2, 41, 75, .9), rgba(2, 87, 134, .42)), url(${imagery.hero})` }}>
        <div className="hero-content">
          <span className="eyebrow">Admission open for {schoolInfo.admissionSession}</span>
          <h1>{schoolInfo.name} {schoolInfo.location}</h1>
          <p>{schoolInfo.motto}. Practical healthcare education for community health, laboratory science, pharmacy, public health, and health information management.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/apply">Start Application <ArrowRight size={18} /></Link>
            <Link className="button ghost" to="/courses">Explore Courses</Link>
          </div>
        </div>
      </section>

      <section className="section split-section">
        <div>
          <span className="eyebrow">About the institution</span>
          <h2>Transforming lives through quality healthcare education.</h2>
          <p>{schoolInfo.philosophy}</p>
          <Link className="text-link" to="/about">Read about our mission <ArrowRight size={16} /></Link>
        </div>
        <img src={assetPaths.programsFlyer} alt="Unique College programmes and entry requirements" loading="lazy" />
      </section>

      <section className="section feature-grid">
        {[
          [Microscope, "Medical laboratory training", "Diagnostic support skills and safe laboratory practice."],
          [Activity, "Community health focus", "Primary health care knowledge for service in any community."],
          [BookOpen, "Clear admission pathway", "Entry requirements and programme details are easy to review."],
          [ShieldCheck, "Professional formation", "Training for responsible, inventive, and competent health workers."]
        ].map(([Icon, title, text]) => (
          <article className="feature-card" key={title}>
            <Icon size={26} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Courses</span>
          <h2>Available programmes</h2>
        </div>
        <div className="cards-grid">
          {programs.slice(0, 3).map((program) => (
            <article className="program-card" key={program.title}>
              <h3>{program.title}</h3>
              <p>{program.summary}</p>
              <span>{program.duration}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="stats-band">
        {stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">News</span>
          <h2>Latest institutional updates</h2>
        </div>
        <div className="cards-grid">
          {sampleNews.map((item) => (
            <article className="news-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to apply for {schoolInfo.admissionSession}?</h2>
        <Link className="button primary" to="/apply">Apply for admission</Link>
      </section>
    </>
  );
}
