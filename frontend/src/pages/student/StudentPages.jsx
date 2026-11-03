import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GraduationCap, FolderOpen, UserRound, ArrowRight, Bell } from "lucide-react";
import { useStudent } from "../../context/StudentContext.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { portalPath } from "../../api/portalLinks.js";
import { notify } from "../../api/notifications.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
import PrivateFileButton from "../../components/PrivateFileButton.jsx";
import StudentAdvisers from "../../components/StudentAdvisers.jsx";

export const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded";
export function StudentHeader({ label, title, children }) { return <header className="student-page-heading"><span className="eyebrow">{label}</span><h1>{title}</h1>{children && <p>{children}</p>}</header>; }

export function StudentDashboard() {
  const { record } = useStudent();
  const latest = record.enrolments[0];
  return <>
    <StudentHeader label="Your dashboard" title={`Welcome, ${record.user.name.split(" ")[0]}`}>Your student account is active. Here is what needs your attention.</StudentHeader>
    <section className="student-identity-card"><div className="student-monogram" aria-hidden="true">{record.user.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div><span className="eyebrow">Student record</span><h2>{record.user.name}</h2><p>{record.application.studentNumber} · {record.user.portalUsername}</p></div><span className="student-badge">Admitted</span></section>
    <section className="student-next-step"><span className="eyebrow">Your next step</span><h2>{!latest ? "Academic assignment is pending" : latest.status !== "CONFIRMED" ? "Confirm your academic details" : "Your academic details are confirmed"}</h2><p>{!latest ? "The registry will assign your official programme, session and level. Your admission programme is retained below; no academic assignment has been invented." : `${latest.programme.name} · ${latest.session.name} · ${latest.level.name}`}</p><Link className="button" to={portalPath("/student/academic")}>View academic record <ArrowRight size={16} /></Link></section>
    <div className="student-quick-grid">{[["My profile", "Keep your contact and next-of-kin information current.", "/student/profile", UserRound], ["Documents & receipts", "Access your accepted form and separate admission receipts.", "/student/records", FolderOpen], ["Academic record", "Review the programme and session assigned by the registry.", "/student/academic", GraduationCap]].map(([title, text, path, Icon]) => <Link className="student-card" to={portalPath(path)} key={path}><Icon size={23} /><h2>{title}</h2><p>{text}</p><span>Open <ArrowRight size={15} /></span></Link>)}</div>
    <StudentAnnouncements compact />
    <StudentAdvisers />
    <details className="student-card student-future"><summary>Other academic services</summary><p>Course registration, attendance, results/GPA, teaching timetables, school-fee billing and transcript requests are not enabled yet. They will appear when the school's academic policies and services are configured.</p></details>
  </>;
}

export function StudentProfile() {
  const { record, refresh } = useStudent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const values = Object.fromEntries(["phoneNumber", "address", "guardianName", "guardianRelationship", "guardianPhone", "guardianAddress"].map((key) => [key, fields.get(key)]));
    setBusy(true); setError("");
    try { await api.patch("/student/profile", { ...values, version: record.updatedAt }); notify({ title: "Profile saved", message: "Your contact details are up to date.", type: "info" }); await refresh(); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <><StudentHeader label="Personal record" title="My profile">Update contact details here. Identity and academic changes must go through the registry.</StudentHeader><section className="student-card"><h2>Identity</h2><dl className="student-definition-grid">{[["Full name", record.application.fullName], ["Student number", record.application.studentNumber], ["Login email", record.user.email], ["Student username", record.user.portalUsername], ["Date of birth", dateLabel(record.application.dateOfBirth)], ["Admission date", dateLabel(record.application.admittedAt)]].map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value || "Not recorded"}</dd></div>)}</dl><details><summary>School email</summary><p>A reserved school email address is not proof that a mailbox has been created. Continue using your existing login email until the school confirms email provisioning.</p></details></section><form className="student-card student-form" onSubmit={save}><h2>Contact and next of kin</h2><div className="student-field-grid">{[["phoneNumber", "Your phone number", 30], ["address", "Contact address", 500], ["guardianName", "Next-of-kin name", 150], ["guardianRelationship", "Relationship", 100], ["guardianPhone", "Next-of-kin phone", 30], ["guardianAddress", "Next-of-kin address", 500]].map(([key, label, maximum]) => <label key={key}>{label}<input name={key} type={key.toLowerCase().includes("phone") ? "tel" : "text"} maxLength={maximum} required={key === "phoneNumber"} defaultValue={record[key] || ""} disabled={busy} /></label>)}</div><ErrorToast message={error} /><div><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save contact details"}</button></div></form></>;
}

export function StudentAcademic() {
  const { record, refresh } = useStudent();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function confirm(event, id) {
    event.preventDefault();
    if (busy) return;
    const entry = record.enrolments.find((item) => item.id === id);
    if (!entry) return;
    setBusy(entry.id); setError("");
    try { await api.post(`/student/enrolments/${entry.id}/confirm`, { declaration: true, version: entry.updatedAt }); notify({ title: "Details confirmed", message: "Your academic details confirmation has been recorded.", type: "info" }); await refresh(); }
    catch (failure) { setError(apiErrorMessage(failure)); }
    finally { setBusy(""); }
  }
  return <><StudentHeader label="My studies" title="Academic record">Your admission and academic assignments are separate records. Check the details before confirming.</StudentHeader><section className="student-card"><h2>Admission</h2><dl className="student-definition-grid"><div><dt>Programme on your application</dt><dd>{record.application.courseOfInterest || "Not recorded"}</dd></div><div><dt>Admission date</dt><dd>{dateLabel(record.application.admittedAt)}</dd></div></dl></section><ErrorToast message={error} />{!record.enrolments.length ? <section className="student-card student-empty"><GraduationCap /><h2>Awaiting academic assignment</h2><p>The registry has not assigned a structured programme, session and level yet. Contact the registry if you need assistance.</p></section> : record.enrolments.map((entry) => <section className="student-card" key={entry.id}><div className="student-section-heading"><h2>{entry.session.name}</h2><span className="student-badge">{entry.status === "CONFIRMED" ? "Details confirmed" : "Please review"}</span></div><dl className="student-definition-grid"><div><dt>Department</dt><dd>{entry.programme.department.name}</dd></div><div><dt>Programme</dt><dd>{entry.programme.name}</dd></div><div><dt>Level</dt><dd>{entry.level.name}</dd></div><div><dt>Session dates</dt><dd>{dateLabel(entry.session.startsAt)} — {dateLabel(entry.session.endsAt)}</dd></div></dl>{entry.status !== "CONFIRMED" ? <form className="student-form" onSubmit={(event) => confirm(event, entry.id)}><label className="check-field"><input type="checkbox" required disabled={Boolean(busy)} />I have checked that these academic details are correct.</label><p>If anything is incorrect, contact the registry instead of confirming. This confirmation is not course registration or school-fee clearance.</p><div><button className="button" type="submit" disabled={Boolean(busy)}>{busy === entry.id ? "Confirming…" : "Confirm academic details"}</button></div></form> : <p>Confirmed {dateLabel(entry.confirmedAt)}. Changes now require the registry's record-correction process.</p>}</section>)}</>;
}

export function StudentRecords() {
  const { record } = useStudent();
  return <><StudentHeader label="My documents" title="Documents & receipts">Download your records individually. Payment receipts are separate from your application form.</StudentHeader><section className="student-card"><h2>Student registration documents</h2><div className="portal-form-actions"><Link className="button" to={portalPath("/student/school-forms/STUDENT_RECORD")}>Complete student record form</Link><Link className="button secondary" to={portalPath("/student/school-forms/GUARANTOR")}>Complete guarantor’s form</Link><Link to={portalPath("/student/school-forms/ACCEPTANCE")}>Acceptance form</Link></div></section><section className="student-card"><ApplicationDownloads application={record.application} /></section><details className="student-card"><summary>Supporting admission documents</summary><div className="student-document-list">{record.application.documents.length ? record.application.documents.map((document) => <div key={document.id}><div><strong>{document.label}</strong><span>{document.reviewStatus.toLowerCase()}</span></div><PrivateFileButton path={document.path}>Download document</PrivateFileButton></div>) : <p>No supporting documents are available.</p>}</div></details></>;
}

export function StudentAnnouncements({ compact = false }) {
  const [result, setResult] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api.get("/student/announcements", { params: { page }, signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setResult(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);
  const items = compact ? result.items.slice(0, 3) : result.items;
  return <section>{!compact && <StudentHeader label="Student noticeboard" title="Announcements">Published notices from the school, without unrelated website content.</StudentHeader>}{compact && <div className="student-section-heading"><h2>Latest announcements</h2><Link to={portalPath("/student/announcements")}>View all</Link></div>}<ErrorToast message={error} />{loading ? <p role="status">Loading announcements…</p> : error ? <button className="button secondary" onClick={() => setRevision((value) => value + 1)}>Try again</button> : !items.length ? <div className="student-card student-empty"><Bell size={24} /><p>No announcements have been published yet.</p></div> : <div className="student-notice-list">{items.map((item) => <article className="student-card" key={item.id}><span className="eyebrow">{dateLabel(item.publishedAt)}</span><h2>{item.title}</h2><p>{item.excerpt}{item.excerpt.length >= 180 ? "…" : ""}</p><Link to={portalPath(`/student/announcements/${item.id}`)}>Read notice <ArrowRight size={15} /></Link></article>)}</div>}{!compact && <nav className="portal-form-actions" aria-label="Announcement pages"><button type="button" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={loading || page * 10 >= result.total} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}</section>;
}

export function StudentAnnouncement() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setItem(null); setError("");
    api.get(`/student/announcements/${id}`, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setItem(data.data); }).catch((failure) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)); });
    return () => controller.abort();
  }, [id]);
  return <><Link to={portalPath("/student/announcements")}>← All announcements</Link><ErrorToast message={error} />{item ? <article className="student-card"><StudentHeader label={dateLabel(item.publishedAt)} title={item.title} /><div className="student-notice-body">{item.body}</div></article> : <p role="status">{error ? "This notice is not available." : "Loading notice…"}</p>}</>;
}
