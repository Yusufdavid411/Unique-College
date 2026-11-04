import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useConfirmation } from "../context/ConfirmationContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";
import AcademicOperations from "./AcademicOperations.jsx";

const responsibilityLabels = { HOD: "Head of Department", DEPARTMENT_EXAM_OFFICER: "Department exam officer", GENERAL_EXAM_OFFICER: "General exam officer" };

export default function AcademicWorkspace() {
  const { user } = useAuth();
  const confirm = useConfirmation();
  const admin = user.role === "ADMIN";
  const [options, setOptions] = useState(null);
  const [filter, setFilter] = useState({ departmentId: "", sessionId: "", levelId: "" });
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [responsibility, setResponsibility] = useState("HOD");
  const canManage = admin || options?.appointments.some((item) => item.isActive && item.responsibility === "HOD" && item.departmentId === filter.departmentId);
  useEffect(() => {
    const controller = new AbortController();
    api.get("/academic-work/workspace", { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setOptions(data.data);
    }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setCourses([]);
    if (!Object.values(filter).every(Boolean)) return () => controller.abort();
    setLoading(true);
    api.get("/academic-work/courses", { params: filter, signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setCourses(data.data);
    }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, revision]);

  async function mutate(endpoint, method, data, form) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await api.request({ url: endpoint, method, data, timeout: 60000 });
      form?.reset();
      setRevision((value) => value + 1);
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function endAppointment(item) {
    if (busy || !await confirm({ title: "End this appointment?", message: `Remove ${item.staff.name}'s ${responsibilityLabels[item.responsibility]} responsibility? Their login and audit history remain.`, confirmLabel: "End appointment", danger: true })) return;
    await mutate(`/academic-work/appointments/${item.id}`, "DELETE");
  }
  function addAppointment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.departmentId = responsibility === "GENERAL_EXAM_OFFICER" ? null : data.departmentId;
    mutate("/academic-work/appointments", "POST", data);
  }
  function addCourse(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    mutate("/academic-work/courses", "POST", { ...data, ...filter, semester: Number(data.semester), creditUnits: Number(data.creditUnits) }, form);
  }
  return <div className="school-settings">
    <ErrorToast message={error} />
    {!options ? <section className="form-panel"><p>Loading academic responsibilities…</p>{error && <button className="button secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button>}</section> : <>
      <section className="form-panel"><h2>Academic responsibilities</h2>
        {admin && <form className="student-form" onSubmit={addAppointment}>
          <fieldset className="student-field-grid" disabled={busy}>
            <label>Staff member<select name="staffId" required defaultValue=""><option value="">Select staff</option>{options.staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Responsibility<select name="responsibility" value={responsibility} onChange={(event) => setResponsibility(event.target.value)}>{Object.entries(responsibilityLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            {responsibility !== "GENERAL_EXAM_OFFICER" && <label>Department<select name="departmentId" required defaultValue=""><option value="">Select department</option>{options.departments.filter((item) => item.isActive).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
          </fieldset>
          <div><button className="button primary" disabled={busy} type="submit">Assign responsibility</button></div>
        </form>}
        <div className="admin-list">{options.appointments.filter((item) => item.isActive).map((item) => <article key={item.id} className="admin-list-item">
          <div><strong>{item.staff.name}</strong><span>{responsibilityLabels[item.responsibility]} · {item.department?.name || "School-wide"}</span></div>
          {admin && <button className="button secondary" type="button" disabled={busy} onClick={() => endAppointment(item)}>End appointment</button>}
        </article>)}</div>
        {!options.appointments.some((item) => item.isActive) && <p>No responsibilities assigned.</p>}
      </section>
      <section className="form-panel"><h2>Department courses</h2>
        <div className="student-field-grid">
          {[["departmentId", "Department", options.departments], ["sessionId", "Academic session", options.sessions], ["levelId", "Level", options.levels]].map(([key, label, items]) => <label key={key}>{label}<select value={filter[key]} disabled={busy} onChange={(event) => setFilter({ ...filter, [key]: event.target.value })}><option value="">Select {label.toLowerCase()}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name}{item.isActive ? "" : " (inactive)"}</option>)}</select></label>)}
        </div>
        {!Object.values(filter).every(Boolean) ? <p>Select department, session and level to load courses.</p> : <>
          {canManage && <details><summary>Add course</summary><form className="student-form" onSubmit={addCourse}><fieldset className="student-field-grid" disabled={busy}>
            <label>Programme<select name="programmeId" required defaultValue=""><option value="">Select programme</option>{options.programmes.filter((item) => item.departmentId === filter.departmentId && item.isActive).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Semester<select name="semester"><option value="1">First semester</option><option value="2">Second semester</option></select></label>
            <label>Course code<input name="code" required maxLength={30} /></label>
            <label>Course title<input name="title" required minLength={2} maxLength={200} /></label>
            <label>Credit units<input name="creditUnits" type="number" required min={1} max={30} step={1} /></label>
            <label>Type<select name="category"><option value="CORE">Core</option><option value="ELECTIVE">Elective</option></select></label>
          </fieldset><div><button className="button primary" type="submit" disabled={busy}>Save draft course</button></div></form></details>}
          {loading ? <p role="status">Loading courses…</p> : <div className="admin-list">{courses.map((course) => <article className="admin-list-item" key={course.id}><div><strong>{course.code} · {course.title}</strong><span>{course.creditUnits} units · Semester {course.semester} · {course.programme.name}</span><small>{course.published ? "Published" : "Draft"} · {course.category.toLowerCase()}</small></div>{canManage && <button className="button secondary" type="button" disabled={busy} onClick={() => mutate(`/academic-work/courses/${course.id}`, "PATCH", { published: !course.published })}>{course.published ? "Unpublish" : "Publish"}</button>}</article>)}{!courses.length && <p>No courses in this selection.</p>}</div>}
        </>}
      </section>
      {Object.values(filter).every(Boolean) && <AcademicOperations key={Object.values(filter).join(":")} filter={filter} programmes={options.programmes} />}
    </>}
  </div>;
}
