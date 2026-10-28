import { ArrowRight, BookOpenCheck, ChevronDown, Clock3, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { applicationHref } from "../api/portalLinks.js";

export default function CourseCard({ program, index }) {
  return (
    <article className="course-card">
      <div className="course-card-header">
        <span className="course-card-icon"><BookOpenCheck size={24} aria-hidden="true" /></span>
        <span className="course-card-number">Programme {String(index + 1).padStart(2, "0")}</span>
      </div>

      <h2>{program.title}</h2>
      <p className="course-card-summary">{program.summary}</p>

      <span className="course-duration"><Clock3 size={17} aria-hidden="true" />{program.duration}</span>

      <details className="course-details">
        <summary>
          <span>View course details</span>
          <ChevronDown size={19} aria-hidden="true" />
        </summary>
        <div className="course-details-content">
          <div className="course-detail-row">
            <ListChecks size={20} aria-hidden="true" />
            <div>
              <strong>Admission requirements</strong>
              <p>{program.requirements}</p>
            </div>
          </div>
          <Link className="text-link" to={applicationHref()}>
            Apply for this programme <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </details>
    </article>
  );
}
