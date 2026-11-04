import { useEffect, useState } from "react";
import { useStudent } from "../../context/StudentContext.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";

export default function StudentCourses() {
  const { record } = useStudent();
  const [sessionId, setSessionId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const enrolments = record.enrolments.filter((item) => item.status === "CONFIRMED");
  const sessions = [...new Map(enrolments.map((item) => [item.session.id, item.session])).values()];
  const levels = enrolments.filter((item) => item.session.id === sessionId).map((item) => item.level);
  useEffect(() => {
    const controller = new AbortController();
    setCourses([]); setError("");
    if (!sessionId || !levelId) return () => controller.abort();
    setLoading(true);
    api.get("/student/courses", { params: { sessionId, levelId }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setCourses(data.data); })
      .catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sessionId, levelId]);
  return <><header className="student-page-heading"><span className="eyebrow">Academic courses</span><h1>Course catalogue</h1><p>Published courses for your assigned programme. Course registration and HOD approval will be enabled separately.</p></header>
    <section className="student-card student-field-grid">
      <label>Academic session<select value={sessionId} onChange={(event) => { setSessionId(event.target.value); setLevelId(""); }}><option value="">Select session</option>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Level<select value={levelId} disabled={!sessionId} onChange={(event) => setLevelId(event.target.value)}><option value="">Select level</option>{levels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </section>
    <ErrorToast message={error} />
    {!enrolments.length ? <p>Confirm your academic assignment in Academic record to see courses.</p> : !sessionId || !levelId ? <p>Select a session and level.</p> : loading ? <p role="status">Loading courses…</p> : <div className="student-quick-grid">{[1, 2].map((semester) => {
      const items = courses.filter((course) => course.semester === semester);
      return <section className="student-card" key={semester}><h2>{semester === 1 ? "First" : "Second"} semester</h2><p>{items.length} courses · {items.reduce((sum, item) => sum + item.creditUnits, 0)} credit units</p><ul>{items.map((course) => <li key={course.id}><strong>{course.code} · {course.title}</strong><p>{course.creditUnits} units · {course.category.toLowerCase()}</p></li>)}</ul>{!items.length && <p>No published courses yet.</p>}</section>;
    })}</div>}
  </>;
}
