import { Link } from "react-router-dom";
import { useStudent } from "../context/StudentContext.jsx";
import { portalPath } from "../api/portalLinks.js";

export default function StudentRegistrationProgress() {
  const { record } = useStudent();
  const submitted = (kind) => record.application.schoolForms?.some((form) => form.kind === kind && form.status === "SUBMITTED");
  const steps = [
    { title: "Academic assignment", complete: record.enrolments.some((item) => item.status === "CONFIRMED"), path: "/student/academic" },
    { title: "Student record / biodata", complete: submitted("STUDENT_RECORD"), path: "/student/school-forms/STUDENT_RECORD" },
    { title: "Guarantor’s form", complete: submitted("GUARANTOR"), path: "/student/school-forms/GUARANTOR" }
  ];
  const next = steps.find((step) => !step.complete);
  return <section className="student-card"><h2>Student registration</h2>
    <ol className="admission-checklist">{steps.map((step) => <li key={step.path}>{step.title} · {step.complete ? "Completed" : "Not completed"}</li>)}</ol>
    {next ? <Link className="button primary" to={portalPath(next.path)}>Continue: {next.title}</Link> : <Link className="button secondary" to={portalPath("/student/records")}>View completed forms</Link>}
  </section>;
}
