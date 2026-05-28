import Seo from "../../components/Seo.jsx";
import { assetPaths, schoolInfo } from "../../data/siteData.js";

export default function About() {
  return (
    <>
      <Seo title="About" description="Mission, vision, history, accreditation, and leadership of Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">About Unique College</span>
        <h1>{schoolInfo.motto} in health science education.</h1>
      </section>
      <section className="section split-section">
        <img src={assetPaths.campusWide} alt="Unique College students and campus life" loading="lazy" />
        <div className="stack">
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
        </div>
      </section>
      <section className="section cards-grid">
        <article className="info-card"><h3>Registered Identity</h3><p>RC: 7901067. Unique College of Health Science and Technology serves students from its Kwali-Abuja campus.</p></article>
        <article className="info-card"><h3>Campus Address</h3><p>{schoolInfo.address}</p></article>
        <article className="info-card"><h3>Contact</h3><p>{schoolInfo.email}. {schoolInfo.phoneDisplay}.</p></article>
      </section>
    </>
  );
}
