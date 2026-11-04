import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { BookOpen, LayoutDashboard, Users, Settings, UserRound } from "lucide-react";
import ChangePassword from "../../components/ChangePassword.jsx";
import PortalShell from "../../components/PortalShell.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../api/client.js";
import { portalPath } from "../../api/portalLinks.js";

export default function StaffLayout() {
  const { user } = useAuth();
  const links = [["Dashboard", "/staff", LayoutDashboard], ["Academic workspace", "/staff/academic", BookOpen], ...(user.permissions.includes("advisees.read") ? [["My students", "/staff/students", Users]] : []), ["Profile & access", "/staff/profile", UserRound], ["Settings", "/staff/settings", Settings]];
  return <PortalShell title="Staff portal" accountScope="staff" links={links}><Outlet /></PortalShell>;
}

export function StaffDashboard() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setFailed(false); api.get("/staff/me", { signal: controller.signal }).then((response) => setRecord(response.data.data)).catch((error) => { if (error.code !== "ERR_CANCELED") setFailed(true); }); return () => controller.abort(); }, [revision]);
  return <><header className="admin-header"><span className="eyebrow">Staff workspace</span><h1>Welcome, {user.name}</h1><p>{user.assignedRoles?.join(" · ") || "Your administrator has not assigned a role yet."}</p></header><section className="student-card"><h2>Your responsibilities</h2>{!record ? <p role="status">{failed ? "Your workspace could not be loaded." : "Loading your workspace…"}</p> : user.permissions.includes("advisees.read") ? <><p><strong>{record.studentCount}</strong> active student-session {record.studentCount === 1 ? "assignment" : "assignments"}</p><Link className="button primary" to={portalPath("/staff/students")}>View my students</Link><p>Only students assigned to you by the school are available here.</p></> : <p>Your account is active. Your administrator controls your roles and access. No student records have been shared with you.</p>}{failed && <button className="button" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section><details className="student-card"><summary>What comes next?</summary><p>Course teaching assignments, attendance, results and timetables will be connected as those modules are implemented. Adviser assignments here are not course registrations.</p></details></>;
}

export function StaffSettings() {
  return <><header className="admin-header"><span className="eyebrow">My account</span><h1>Settings</h1><p>You can change your password here whenever you choose.</p></header><ChangePassword embedded /></>;
}

export function StaffProfile() {
  const { user } = useAuth();
  return <><header className="admin-header"><span className="eyebrow">My account</span><h1>Profile & access</h1><p>Your administrator manages your institutional responsibilities.</p></header><section className="student-card"><dl className="student-definition-grid"><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Login email</dt><dd>{user.email}</dd></div><div><dt>Assigned roles</dt><dd>{user.assignedRoles?.join(", ") || "Not assigned"}</dd></div></dl></section><details className="student-card"><summary>My permissions</summary>{user.permissions.length ? <ul>{user.permissions.map((permission) => <li key={permission}>{permission === "advisees.read" ? "View assigned students" : permission.replaceAll(".", " · ")}</li>)}</ul> : <p>No additional permissions assigned.</p>}</details></>;
}

export function StaffStudents() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const allowed = user.permissions.includes("advisees.read");
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController(); setResult(null); setFailed(false);
    api.get("/staff/students", { params: { page }, signal: controller.signal }).then((response) => setResult(response.data.data)).catch((error) => { if (error.code !== "ERR_CANCELED") setFailed(true); });
    return () => controller.abort();
  }, [page, revision, allowed]);
  return <><header className="admin-header"><span className="eyebrow">Academic advising</span><h1>My students</h1><p>Active assignments for your academic sessions. Admission documents, payments and private family records are not shared here.</p></header>{!allowed ? <section className="student-card"><p>Your current role does not permit access to assigned students.</p></section> : !result ? <section className="student-card"><p>{failed ? "Student assignments could not be loaded." : "Loading assignments…"}</p>{failed && <button className="button" onClick={() => setRevision((value) => value + 1)}>Try again</button>}</section> : <>{!result.students.length && <section className="student-card"><h2>No students assigned yet</h2><p>Ask the administrator to assign an admitted student and academic session to you.</p></section>}{result.students.map(({ id, enrolment }) => <article className="student-card" key={id}><h2>{enrolment.student.user.name}</h2><p>{enrolment.student.application.studentNumber}</p><p>{enrolment.programme.name} · {enrolment.level.name} · {enrolment.session.name}</p><details><summary>Academic & contact details</summary><p>Department: {enrolment.programme.department.name}</p><p>Student email: {enrolment.student.user.email}</p><p>Academic assignment: {enrolment.status === "CONFIRMED" ? "Confirmed by student" : "Awaiting student confirmation"}</p></details></article>)}<nav className="document-page-actions" aria-label="Assigned student pages"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= result.total} onClick={() => setPage((value) => value + 1)}>Next</button></nav></>}</>;
}
