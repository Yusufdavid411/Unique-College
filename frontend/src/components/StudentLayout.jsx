import { Outlet } from "react-router-dom";
import { BookOpen, FileCheck2, Monitor, LayoutDashboard, UserRound, GraduationCap, FolderOpen, Bell, ShieldCheck } from "lucide-react";
import PortalShell from "./PortalShell.jsx";
import { StudentProvider, useStudent } from "../context/StudentContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";
const links = [["Dashboard", "/student", LayoutDashboard], ["My profile", "/student/profile", UserRound], ["Academic record", "/student/academic", GraduationCap], ["Courses", "/student/courses", BookOpen], ["Results", "/student/results", FileCheck2], ["CBT", "/student/cbt", Monitor], ["Documents & receipts", "/student/records", FolderOpen], ["Announcements", "/student/announcements", Bell], ["Account security", "/student/security", ShieldCheck]];
function Content() {
  const { record, loading, error, refresh } = useStudent();
  return <PortalShell title="Student portal" links={links}>{loading ? <p role="status">Loading your student record…</p> : !record ? <section className="student-card"><h1>We couldn't load your record</h1><p>Try again, or contact the registry if the problem continues.</p><ErrorToast message={error} /><button className="button" type="button" onClick={refresh}>Try again</button></section> : <Outlet />}</PortalShell>;
}
export default function StudentLayout() { return <StudentProvider><Content /></StudentProvider>; }
