import Seo from "../../components/Seo.jsx";
import { anthem, assetPaths, leadershipWelcome, pledge, schoolInfo } from "../../data/siteData.js";

export default function About() {
  return (
    <>
      <Seo title="About" description="Mission, vision, history, accreditation, and leadership of Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">About Unique College</span>
        <h1>{schoolInfo.motto} in health science education.</h1>
      </section>
      <section className="section leadership-section about-leadership">
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
        </div>
      </section>
      <section className="section split-section">
        <div className="stack">
          <article>
            <h2>About us</h2>
            <p>{schoolInfo.about}</p>
            <p>{schoolInfo.profile}</p>
          </article>
          <article>
            <h2>Mission</h2>
            <p>{schoolInfo.mission}</p>
          </article>
          <article>
            <h2>Vision</h2>
            <p>{schoolInfo.vision}</p>
          </article>
          <article>
            <h2>Philosophy</h2>
            <p>{schoolInfo.philosophy}</p>
          </article>
          <article>
            <h2>Objective</h2>
            <p>{schoolInfo.objective}</p>
          </article>
        </div>
        <img src={assetPaths.campusGate} alt="Unique College campus entrance" loading="lazy" />
      </section>
      <section className="section cards-grid">
        <article className="info-card"><h3>Registered Identity</h3><p>{schoolInfo.identity}</p></article>
        <article className="info-card"><h3>Approval</h3><p>{schoolInfo.approval}</p></article>
        <article className="info-card"><h3>Campus Address</h3><p>{schoolInfo.address}</p></article>
        <article className="info-card"><h3>Contact</h3><p>{schoolInfo.email}. {schoolInfo.phoneDisplay}.</p></article>
      </section>
      <section className="section split-section anthem-section">
        <div className="anthem-card">
          <span className="eyebrow">School Anthem</span>
          <h2>{anthem.title}</h2>
          {anthem.verses.map((verse, index) => (
            <div className="anthem-lines" key={index}>
              {verse.map((line) => <p key={line}>{line}</p>)}
              {index === 0 && (
                <div className="chorus">
                  <strong>Chorus</strong>
                  {anthem.chorus.map((line) => <p key={line}>{line}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="anthem-card">
          <span className="eyebrow">School Pledge</span>
          <h2>{pledge.title}</h2>
          {pledge.lines.map((line) => <p key={line}>{line}</p>)}
        </div>
      </section>
    </>
  );
}
