import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, BookOpen, CheckCircle2, Microscope, ShieldCheck } from "lucide-react";
import { api, assetUrl } from "../../api/client.js";
import Seo from "../../components/Seo.jsx";
import { assetPaths, imagery, leadershipWelcome, programs, schoolInfo, stats } from "../../data/siteData.js";

export default function Home() {
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [hiddenNewsImages, setHiddenNewsImages] = useState([]);

  useEffect(() => {
    api
      .get("/news/public")
      .then((res) => setNews(res.data.data.slice(0, 2)))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  return (
    <>
      <Seo title="Home" description="Unique College of Health Science and Technology official website and admission portal." />
      <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(2, 41, 75, .9), rgba(2, 87, 134, .34)), url(${imagery.hero})` }}>
        <div className="hero-content">
          <span className="eyebrow">Admission open for {schoolInfo.admissionSession}</span>
          <h1>{schoolInfo.name} {schoolInfo.location}</h1>
          <p>{schoolInfo.motto}. Practical healthcare education for community health, pharmacy technology, medical laboratory technology, health information management, public health, and health promotion.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/apply">Start Application <ArrowRight size={18} /></Link>
            <Link className="button ghost" to="/courses">Explore Courses</Link>
          </div>
        </div>
      </section>

      <section className="section leadership-section">
        <div className="leader-portrait">
          <img src={leadershipWelcome.image} alt={leadershipWelcome.name} loading="lazy" />
          <div>
            <strong>{leadershipWelcome.name}</strong>
            <span>{leadershipWelcome.role}</span>
          </div>
        </div>
        <div className="leader-copy">
          <span className="eyebrow">{leadershipWelcome.label}</span>
          <h2>{leadershipWelcome.title}</h2>
          {leadershipWelcome.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className="leader-points">
            {leadershipWelcome.points.map((point) => (
              <span key={point}><CheckCircle2 size={20} />{point}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section split-section">
        <div>
          <span className="eyebrow">About the institution</span>
          <h2>Transforming lives through quality healthcare education.</h2>
          <p>{schoolInfo.profile}</p>
          <Link className="text-link" to="/about">Read about our mission <ArrowRight size={16} /></Link>
        </div>
        <img src={assetPaths.campusGate} alt="Unique College campus entrance" loading="lazy" />
      </section>

      <section className="section feature-grid">
        {[
          [Microscope, "Medical laboratory training", "Diagnostic support skills and safe laboratory practice."],
          [Activity, "Primary health care focus", "Health personnel prepared for meaningful service in communities."],
          [BookOpen, "Six ND programmes", "Updated academic options with 4-semester programme duration."],
          [ShieldCheck, "Approved institution", `${schoolInfo.registrationNumber} with provisional approval in FCT-Abuja.`]
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
        <div className="section-action">
          <Link className="text-link" to="/courses">See all courses <ArrowRight size={16} /></Link>
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
        {!newsLoading && !news.length && (
          <div className="empty-state">No published news yet. Updates added from the admin dashboard will appear here.</div>
        )}
        <div className="cards-grid">
          {news.map((item) => (
            <article className="news-card news-card-media" key={item.id}>
              {item.imagePath && !hiddenNewsImages.includes(item.id) && (
                <img
                  src={assetUrl(item.imagePath)}
                  alt={item.title}
                  loading="lazy"
                  onError={() => setHiddenNewsImages((current) => [...current, item.id])}
                />
              )}
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </article>
          ))}
        </div>
        <div className="section-action">
          <Link className="text-link" to="/news">See more news <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to apply for {schoolInfo.admissionSession}?</h2>
        <Link className="button primary" to="/apply">Apply for admission</Link>
      </section>
    </>
  );
}
