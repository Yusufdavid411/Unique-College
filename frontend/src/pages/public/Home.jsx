import { Link } from "react-router-dom";
import { Activity, ArrowRight, BookOpen, Microscope, ShieldCheck } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { imagery, programs, sampleNews, stats } from "../../data/siteData.js";

export default function Home() {
  return (
    <>
      <Seo title="Home" description="Unique College of Health Science and Technology official website and admission portal." />
      <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(2, 41, 75, .88), rgba(2, 87, 134, .46)), url(${imagery.hero})` }}>
        <div className="hero-content">
          <span className="eyebrow">Healthcare education for a digital clinical world</span>
          <h1>Unique College of Health Science and Technology</h1>
          <p>Professional health science training, laboratory exposure, and technology-ready academic systems for future healthcare workers.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/apply">Start Application <ArrowRight size={18} /></Link>
            <Link className="button ghost" to="/courses">Explore Courses</Link>
          </div>
        </div>
      </section>

      <section className="section split-section">
        <div>
          <span className="eyebrow">About the institution</span>
          <h2>Built for practical medical and technology education.</h2>
          <p>Unique College combines academic discipline with clinical awareness, modern laboratories, health data literacy, and a foundation ready for student portals, staff systems, CBT, payments, and mobile integration.</p>
          <Link className="text-link" to="/about">Read about our mission <ArrowRight size={16} /></Link>
        </div>
        <img src={imagery.lab} alt="Medical laboratory training" loading="lazy" />
      </section>

      <section className="section feature-grid">
        {[
          [Microscope, "Laboratory practice", "Structured lab exposure and healthcare safety principles."],
          [Activity, "Clinical readiness", "Programmes shaped around real care environments."],
          [BookOpen, "Academic clarity", "Transparent admission and programme information."],
          [ShieldCheck, "Portable systems", "Database and uploads designed for future self-hosting."]
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
          <h2>Health science programmes</h2>
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
        <h2>Ready to begin your health science training?</h2>
        <Link className="button primary" to="/apply">Apply for admission</Link>
      </section>
    </>
  );
}
