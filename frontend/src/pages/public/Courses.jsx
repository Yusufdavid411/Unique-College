import Seo from "../../components/Seo.jsx";
import { programs } from "../../data/siteData.js";

export default function Courses() {
  return (
    <>
      <Seo title="Courses" description="Health science programmes, duration, and requirements at Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">Programmes</span>
        <h1>Health science courses designed around practical clinical environments.</h1>
      </section>
      <section className="section course-list">
        {programs.map((program) => (
          <article className="course-row" key={program.title}>
            <div>
              <h2>{program.title}</h2>
              <p>{program.summary}</p>
            </div>
            <div>
              <strong>Duration</strong>
              <span>{program.duration}</span>
            </div>
            <div>
              <strong>Requirements</strong>
              <span>{program.requirements}</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
