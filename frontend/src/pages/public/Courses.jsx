import CourseCard from "../../components/CourseCard.jsx";
import Seo from "../../components/Seo.jsx";
import { programs } from "../../data/siteData.js";

export default function Courses() {
  return (
    <>
      <Seo title="Courses" description="Health science programmes, duration, and requirements at Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">Programmes</span>
        <h1>Health Science Programmes Designed For Practical Healthcare Service.</h1>
        <p>Explore each programme at your own pace and open the details only when you need admission information.</p>
      </section>

      <section className="section course-directory-section">
        <div className="section-heading">
          <span className="eyebrow">Academic Programmes</span>
          <h2>Choose Your Area Of Study</h2>
          <p>Review the programme overview first, then expand a card to see its admission requirements and application link.</p>
        </div>
        <div className="course-card-grid">
          {programs.map((program, index) => (
            <CourseCard program={program} index={index} key={program.title} />
          ))}
        </div>
      </section>
    </>
  );
}
