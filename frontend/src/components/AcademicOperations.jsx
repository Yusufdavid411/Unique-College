import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { useConfirmation } from "../context/ConfirmationContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";

const watIso = (value) => new Date(value + "+01:00").toISOString();
export default function AcademicOperations({ filter, programmes }) {
  const confirm = useConfirmation();
  const [record, setRecord] = useState(null);
  const [revision, setRevision] = useState(0);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setError("");
    api.get("/academic-flow/workspace", { params: filter, signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setRecord(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [filter, revision]);
  async function saveWindow(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.put("/academic-flow/windows", { ...data, sessionId: filter.sessionId, levelId: filter.levelId, semester: Number(data.semester), minUnits: Number(data.minUnits), maxUnits: Number(data.maxUnits), opensAt: watIso(data.opensAt), closesAt: watIso(data.closesAt) });
      setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function reviewRegistration(event, registration) {
    event.preventDefault(); if (busy) return;
    const fields = new FormData(event.currentTarget);
    const status = fields.get("status");
    if (!await confirm({ title: status === "APPROVED" ? "Approve course registration?" : "Return registration for corrections?", message: registration.enrolment.student.user.name, confirmLabel: "Confirm decision" })) return;
    setBusy(true); setError("");
    try {
      await api.patch(`/academic-flow/registrations/${registration.id}`, { status, note: fields.get("note"), version: registration.updatedAt });
      setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <section className="form-panel"><h2>Registration & examinations</h2><ErrorToast message={error} />
    {!record ? <p role="status">Loading departmental workflows…</p> : <>
      {record.canManage && <details><summary>Registration window & unit limits</summary><form className="student-form" onSubmit={saveWindow}>
        <fieldset className="student-field-grid" disabled={busy}>
          <label>Programme<select name="programmeId" required><option value="">Select programme</option>{programmes.filter((item) => item.departmentId === filter.departmentId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Semester<select name="semester"><option value={1}>First semester</option><option value={2}>Second semester</option></select></label>
          <label>Opens (Nigeria/WAT)<input type="datetime-local" name="opensAt" required /></label><label>Closes (Nigeria/WAT)<input type="datetime-local" name="closesAt" required /></label>
          <label>Minimum units<input type="number" name="minUnits" min={0} max={100} required /></label><label>Maximum units<input type="number" name="maxUnits" min={1} max={100} required /></label>
        </fieldset><div><button className="button primary" type="submit" disabled={busy}>Save registration window</button></div>
      </form>{record.windows.map((item) => <p key={item.id}>{programmes.find((programme) => programme.id === item.programmeId)?.name} · Semester {item.semester} · {item.minUnits}–{item.maxUnits} units · {new Date(item.closesAt).toLocaleDateString("en-NG")}</p>)}</details>}
      <details><summary>Submitted course registrations</summary><p>Latest 200 matching registrations.</p>
        {record.registrations.map((registration) => <article className="student-card" key={registration.id}><h3>{registration.enrolment.student.user.name}</h3><p>{registration.enrolment.student.application.studentNumber} · Semester {registration.semester} · {registration.status}</p><ul>{registration.items.map((item) => <li key={item.id}>{item.code} · {item.creditUnits} units</li>)}</ul>
          {record.canManage && registration.status === "SUBMITTED" && <form className="student-form" onSubmit={(event) => reviewRegistration(event, registration)}><fieldset disabled={busy}><label>Decision<select name="status"><option value="APPROVED">Approve</option><option value="RETURNED">Return for corrections</option></select></label><label>Correction reason (required when returning)<textarea name="note" maxLength={1000} /></label></fieldset><div><button className="button primary" type="submit" disabled={busy}>Confirm decision</button></div></form>}
        </article>)}{!record.registrations.length && <p>No course registrations submitted.</p>}
      </details>
      <label>Course for result processing{record.canManage ? " / CBT" : ""}<select value={courseId} disabled={busy} onChange={(event) => setCourseId(event.target.value)}><option value="">Select course</option>{record.courses.map((course) => <option value={course.id} key={course.id}>{course.code} · {course.title} · Semester {course.semester}</option>)}</select></label>
      {courseId && <CourseResults key={courseId} courseId={courseId} />}
      {courseId && record.canManage && <CbtBuilder key={"cbt-" + courseId} courseId={courseId} />}
    </>}
  </section>;
}

function CourseResults({ courseId }) {
  const confirm = useConfirmation();
  const [record, setRecord] = useState(null);
  const [scores, setScores] = useState({});
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api.get(`/academic-flow/courses/${courseId}/results`, { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setRecord(data.data);
      setScores(Object.fromEntries((data.data.batch?.entries || []).map((item) => [item.registrationItemId, String(item.score)])));
    }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [courseId, revision]);
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      await api.put(`/academic-flow/courses/${courseId}/results`, { version: record.batch?.updatedAt || null, scores: record.students.map(({ id }) => ({ registrationItemId: id, score: Number(scores[id]) })) });
      setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function transition(action) {
    if (busy || !await confirm({ title: action === "PUBLISH" ? "Publish student results?" : "Move result batch?", message: action === "PUBLISH" ? "These scores become visible to the registered students and cannot be overwritten." : "The next officer will receive this batch. Review the scores before continuing.", confirmLabel: "Confirm" })) return;
    setBusy(true); setError("");
    try {
      await api.post(`/academic-flow/results/${record.batch.id}/transition`, { action, note, version: record.batch.updatedAt });
      setNote(""); setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  const editable = record?.editable && (!record.batch || record.batch.status === "DRAFT");
  return <details open className="settings-panel"><summary>Course results</summary><ErrorToast message={error} />
    {!record ? <p>Loading class list…</p> : <div className="student-form"><p>Status: {record.batch?.status || "No result batch"} · {record.students.length} approved registrations</p>{record.batch?.reviewNote && <p>{record.batch.reviewNote}</p>}
      <form className="student-form" onSubmit={save}><fieldset disabled={busy || !editable}>
        <legend>Scores out of 100</legend>{record.students.map((student) => <label key={student.id}>{student.name} · {student.studentNumber}<input type="number" min={0} max={100} step="0.01" required value={scores[student.id] ?? ""} onChange={(event) => setScores({ ...scores, [student.id]: event.target.value })} /></label>)}
      </fieldset>{editable && record.students.length > 0 && <div><button className="button secondary" type="submit" disabled={busy}>Save result batch</button></div>}</form>
      {record.action && <><label>Review note<textarea value={note} maxLength={1000} disabled={busy} onChange={(event) => setNote(event.target.value)} /></label><div className="document-page-actions">
        <button className="button primary" type="button" disabled={busy} onClick={() => transition(record.action)}>{{ SUBMIT: "Send to department exam officer", FORWARD: "Send to general exam officer", PUBLISH: "Publish results to students" }[record.action]}</button>
        {record.action !== "SUBMIT" && <button className="button secondary" type="button" disabled={busy || note.trim().length < 5} onClick={() => transition("RETURN")}>Return to HOD</button>}
      </div></>}
      {record.batch?.history?.length > 0 && <details><summary>Review history</summary><ol>{record.batch.history.map((item, index) => <li key={index}>{item.action} · {new Date(item.at).toLocaleString("en-NG")}{item.note ? " · " + item.note : ""}</li>)}</ol></details>}
    </div>}
  </details>;
}

function CbtBuilder({ courseId }) {
  const confirm = useConfirmation();
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([{ prompt: "", options: ["", "", "", ""], correctIndex: 0 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get(`/cbt/course/${courseId}`, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setExams(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [courseId, revision]);
  const change = (index, update) => setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...update } : question));
  async function create(event) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)); setBusy(true); setError("");
    try {
      await api.post("/cbt/exams", { courseId, title: data.title, startsAt: watIso(data.startsAt), endsAt: watIso(data.endsAt), durationMinutes: Number(data.durationMinutes), questions });
      form.reset(); setQuestions([{ prompt: "", options: ["", "", "", ""], correctIndex: 0 }]); setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function act(exam, action) {
    if (busy || !await confirm({ title: action === "RELEASE_RESULTS" ? "Release CBT scores?" : action === "CANCEL" ? "Cancel this CBT?" : "Publish this CBT?", message: exam.title, confirmLabel: "Confirm" })) return;
    setBusy(true); setError("");
    try { await api.patch(`/cbt/exams/${exam.id}`, { action, version: exam.updatedAt }); setRevision((value) => value + 1); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <details className="settings-panel"><summary>CBT scheduling & questions</summary><ErrorToast message={error} />
    <p>CBT scores are released separately from official course results.</p>
    <form className="student-form" onSubmit={create}><fieldset className="student-field-grid" disabled={busy}>
      <label>Exam title<input name="title" required minLength={3} maxLength={200} /></label><label>Duration (minutes)<input name="durationMinutes" type="number" required min={1} max={240} /></label>
      <label>Starts (Nigeria/WAT)<input name="startsAt" type="datetime-local" required /></label><label>Closes (Nigeria/WAT)<input name="endsAt" type="datetime-local" required /></label>
    </fieldset>{questions.map((question, index) => <fieldset key={index} className="student-form" disabled={busy}><legend>Question {index + 1}</legend><label>Question<textarea required minLength={2} maxLength={2000} value={question.prompt} onChange={(event) => change(index, { prompt: event.target.value })} /></label>
      {question.options.map((option, optionIndex) => <label key={optionIndex}>Option {optionIndex + 1}<input required maxLength={500} value={option} onChange={(event) => change(index, { options: question.options.map((text, position) => position === optionIndex ? event.target.value : text) })} /></label>)}
      <label>Correct option<select value={question.correctIndex} onChange={(event) => change(index, { correctIndex: Number(event.target.value) })}>{question.options.map((option, position) => <option key={position} value={position}>Option {position + 1}</option>)}</select></label>
      {questions.length > 1 && <button className="button secondary" type="button" onClick={() => setQuestions(questions.filter((item, position) => position !== index))}>Remove question</button>}
    </fieldset>)}<div className="document-page-actions"><button className="button secondary" type="button" disabled={busy || questions.length >= 100} onClick={() => setQuestions([...questions, { prompt: "", options: ["", "", "", ""], correctIndex: 0 }])}>Add question</button><button className="button primary" type="submit" disabled={busy}>Save draft CBT</button></div></form>
    {exams.map((exam) => <article className="student-card" key={exam.id}><h3>{exam.title}</h3><p>{exam.status} · {new Date(exam.startsAt).toLocaleString("en-NG")}</p><div className="document-page-actions">
      {exam.status === "DRAFT" && <button className="button primary" type="button" disabled={busy} onClick={() => act(exam, "PUBLISH")}>Publish schedule</button>}
      {exam.status !== "CANCELLED" && <button className="button secondary" type="button" disabled={busy} onClick={() => act(exam, "CANCEL")}>Cancel CBT</button>}
      {exam.status === "PUBLISHED" && !exam.resultsReleased && <button className="button secondary" type="button" disabled={busy} onClick={() => act(exam, "RELEASE_RESULTS")}>Release CBT scores</button>}
    </div></article>)}
  </details>;
}
