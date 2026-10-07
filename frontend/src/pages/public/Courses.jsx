import { GraduationCap } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { departmentLeadership, programs } from "../../data/siteData.js";

export default function Courses() {
  return (
    <>
      <Seo title="Courses" description="Health science programmes, duration, and requirements at Unique College." />
      <section className="page-hero compact">
        <span className="eyebrow">Programmes</span>
        <h1>Health Science Programmes Designed For Practical Healthcare Service.</h1>
      </section>
      <section className="section department-leadership-section">
        <div className="section-heading">
          <span className="eyebrow">Department Leadership</span>
          <h2>Meet The HODs</h2>
          <p>Each department is guided by a Head of Department who introduces the academic focus, practical expectations, and student support structure.</p>
        </div>
        <div className="hod-grid">
          {departmentLeadership.map((leader) => (
            <article className="hod-card" key={leader.department}>
              <img src={leader.image} alt={leader.name} loading="lazy" />
              <div className="hod-card-body">
                <span className="leadership-tag"><GraduationCap size={15} />{leader.department}</span>
                <h3>{leader.name}</h3>
                <strong>{leader.role}</strong>
                <p>{leader.welcome}</p>
              </div>
            </article>
          ))}
        </div>
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
