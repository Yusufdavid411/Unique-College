import { useEffect, useRef, useState } from "react";
import { useStudent } from "../../context/StudentContext.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { useConfirmation } from "../../context/ConfirmationContext.jsx";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import PrivateFilePreview from "../../components/PrivateFilePreview.jsx";

function EnrolmentPicker({ value, onChange }) {
  const { record } = useStudent();
  const items = record.enrolments.filter((item) => item.status === "CONFIRMED");
  const [sessionId, setSessionId] = useState("");
  const sessions = [...new Map(items.map((item) => [item.session.id, item.session])).values()];
  return <section className="student-card student-field-grid">
    <label>Academic session<select value={sessionId} onChange={(event) => { setSessionId(event.target.value); onChange(""); }}><option value="">Select session</option>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Level<select value={value} disabled={!sessionId} onChange={(event) => onChange(event.target.value)}><option value="">Select level</option>{items.filter((item) => item.session.id === sessionId).map((item) => <option key={item.id} value={item.id}>{item.level.name} · {item.programme.name}</option>)}</select></label>
    {!items.length && <p>Confirm your academic assignment in Academic record first.</p>}
  </section>;
}

export function StudentCourseRegistration() {
  const confirm = useConfirmation();
  const [enrolmentId, setEnrolmentId] = useState("");
  const [semester, setSemester] = useState(1);
  const [record, setRecord] = useState(null);
  const [selected, setSelected] = useState([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setRecord(null); setError("");
    if (!enrolmentId) return () => controller.abort();
    api.get("/academic-flow/student/registration", { params: { enrolmentId, semester }, signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setRecord(data.data);
      setSelected(data.data.registration ? data.data.registration.items.map((item) => item.courseId) : data.data.courses.filter((item) => item.category === "CORE").map((item) => item.id));
    }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [enrolmentId, semester, revision]);
  async function submit(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      if (!await confirm({ title: "Submit courses for approval?", message: "Check your selected courses and credit units. Your HOD will review this registration.", confirmLabel: "Submit courses" })) return;
      await api.post("/academic-flow/student/registration", { enrolmentId, semester, courseIds: selected, version: record.registration?.updatedAt || null });
      setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  const locked = record?.registration && record.registration.status !== "RETURNED";
  const courses = locked ? record.registration.items.map((item) => ({ ...item, id: item.courseId })) : record?.courses || [];
  const units = courses.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.creditUnits, 0);
  return <><header className="student-page-heading"><span className="eyebrow">Academic registration</span><h1>Course registration</h1></header>
    <EnrolmentPicker value={enrolmentId} onChange={setEnrolmentId} />
    {enrolmentId && <section className="student-card"><label>Semester<select value={semester} disabled={busy} onChange={(event) => setSemester(Number(event.target.value))}><option value={1}>First semester</option><option value={2}>Second semester</option></select></label></section>}
    <ErrorToast message={error} />
    {enrolmentId && !record && !error && <p role="status">Loading registration…</p>}
    {record && <form className="student-card student-form" onSubmit={submit}>
      <h2>{record.registration?.status === "APPROVED" ? "Registration approved" : record.registration?.status === "SUBMITTED" ? "Awaiting HOD approval" : "Select your courses"}</h2>
      {record.registration?.reviewNote && <p>{record.registration.reviewNote}</p>}
      {record.window && <p>Registration: {new Date(record.window.opensAt).toLocaleString("en-NG")} – {new Date(record.window.closesAt).toLocaleString("en-NG")} · {record.window.minUnits}–{record.window.maxUnits} units</p>}
      {!record.window && !locked && <p>Registration has not been opened for this semester.</p>}
      <fieldset disabled={busy || Boolean(locked)} className="student-form">
        <legend>Courses · {units} selected units</legend>
        {courses.map((course) => <label className="check-field" key={course.id}>
          <input type="checkbox" checked={selected.includes(course.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, course.id] : selected.filter((id) => id !== course.id))} />
          {course.code} · {course.title} · {course.creditUnits} units{course.category ? " · " + course.category.toLowerCase() : ""}
        </label>)}
      </fieldset>
      {!locked && <div><button className="button primary" type="submit" disabled={busy || !record.window || !selected.length}>{busy ? "Submitting…" : "Submit courses for HOD approval"}</button></div>}
      {record.registration?.status === "APPROVED" && <PrivateFilePreview endpoint={`/academic-flow/student/registrations/${record.registration.id}/pdf`} label="Approved course form" buttonText="View course form" filename="approved-course-registration.pdf" allowDownload />}
    </form>}
  </>;
}

export function StudentResults() {
  const [enrolmentId, setEnrolmentId] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setItems(null); setError("");
    if (enrolmentId) api.get("/academic-flow/student/results", { params: { enrolmentId }, signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setItems(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [enrolmentId]);
  return <><header className="student-page-heading"><h1>My results</h1></header><EnrolmentPicker value={enrolmentId} onChange={setEnrolmentId} /><ErrorToast message={error} />
    {items && <section className="student-card"><h2>Published results</h2>{items.length ? <div className="admin-table-wrap"><table><thead><tr><th>Course</th><th>Semester</th><th>Units</th><th>Score / 100</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.registrationItem.code} · {item.registrationItem.title}</td><td>{item.registrationItem.registration.semester}</td><td>{item.registrationItem.creditUnits}</td><td>{item.score}</td></tr>)}</tbody></table></div> : <p>No results have been published for this session.</p>}</section>}
  </>;
}

export function StudentCbt() {
  const confirm = useConfirmation();
  const [exams, setExams] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());
  const operation = useRef(false);
  const answerRevision = useRef(0);
  const clockOffset = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get("/cbt/student/exams", { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setExams(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, []);
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer); }, []);
  async function openExam(exam) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError("");
    try {
      const { data } = await api.post(`/cbt/student/exams/${exam.id}/start`);
      const response = await api.get(`/cbt/student/attempts/${data.data.id}`);
      clockOffset.current = Date.parse(response.data.data.serverTime) - Date.now();
      setAttempt(response.data.data); setAnswers(response.data.data.answers); setDirty(false);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { operation.current = false; setBusy(false); }
  }
  async function persist(submit) {
    if (!attempt || operation.current || attempt.submittedAt) return;
    operation.current = true; setBusy(true); setError("");
    const revision = answerRevision.current;
    try {
      const { data } = await api.put(`/cbt/student/attempts/${attempt.id}`, { answers, submit, version: attempt.version }, { notifyOnError: false });
      clockOffset.current = Date.parse(data.data.serverTime) - Date.now();
      setAttempt(data.data);
      if (answerRevision.current === revision) setDirty(false);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { operation.current = false; setBusy(false); }
  }
  const remaining = attempt ? Math.max(0, Math.ceil((Date.parse(attempt.deadline) - tick - clockOffset.current) / 1000)) : 0;
  useEffect(() => {
    if (!attempt || attempt.submittedAt || busy || error || (!dirty && remaining > 0)) return;
    const timer = setTimeout(() => persist(remaining === 0), remaining === 0 ? 0 : 800);
    return () => clearTimeout(timer);
  }, [dirty, answers, busy, attempt, remaining, error]);
  async function submit() {
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try {
      const accepted = await confirm({ title: "Submit exam answers?", message: "You cannot edit your answers after submitting.", confirmLabel: "Submit exam" });
      operation.current = false;
      if (accepted) await persist(true);
    } finally { operation.current = false; setBusy(false); }
  }
  return <><header className="student-page-heading"><h1>CBT examinations</h1></header><ErrorToast message={error} />
    {!attempt ? <div className="student-form">{exams?.map((exam) => <section className="student-card" key={exam.id}><h2>{exam.title}</h2><p>{exam.course.code} · {exam.durationMinutes} minutes</p><p>{new Date(exam.startsAt).toLocaleString("en-NG")} – {new Date(exam.endsAt).toLocaleString("en-NG")}</p><button className="button primary" type="button" disabled={busy} onClick={() => openExam(exam)}>{exam.attempts?.length ? "Open attempt" : "Start exam"}</button></section>)}{exams?.length === 0 && <p>No scheduled exams for your approved courses.</p>}</div>
      : <section className="student-card student-form"><h2>{attempt.title}</h2>
        {attempt.submittedAt ? <><p>Exam submitted.</p><p>{attempt.score == null ? "Results have not been released." : `Score: ${attempt.score} / 100`}</p><button className="button secondary" type="button" onClick={() => setAttempt(null)}>Back to examinations</button></> : <>
          <p role="timer">Time remaining: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} · {busy ? "Saving…" : dirty ? "Unsaved changes" : "Answers saved"}</p>
          {error && <button className="button secondary" type="button" disabled={busy} onClick={() => persist(false)}>Retry saving</button>}
          {attempt.questions.map((question, index) => <fieldset key={question.id} disabled={remaining === 0}><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label className="check-field" key={optionIndex}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => { answerRevision.current++; setAnswers({ ...answers, [question.id]: optionIndex }); setDirty(true); }} />{option}</label>)}</fieldset>)}
          <div><button className="button primary" type="button" disabled={busy} onClick={submit}>Submit exam</button></div>
        </>}
      </section>}
  </>;
}
