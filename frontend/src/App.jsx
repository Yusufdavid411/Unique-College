import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import PublicLayout from "./components/PublicLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { ApplicantTransition, StudentContinuation } from "./components/StudentTransfer.jsx";
import Home from "./pages/public/Home.jsx";
import About from "./pages/public/About.jsx";
import Leadership from "./pages/public/Leadership.jsx";
import Courses from "./pages/public/Courses.jsx";
import Admission from "./pages/public/Admission.jsx";
import Contact from "./pages/public/Contact.jsx";
import Gallery from "./pages/public/Gallery.jsx";
import News from "./pages/public/News.jsx";
import ApplicantAccess from "./pages/applicant/ApplicantAccess.jsx";
import ApplicantDashboard from "./pages/applicant/ApplicantDashboard.jsx";
import ApplicantApplicationForm from "./pages/applicant/ApplicantApplicationForm.jsx";
import ApplicantDocuments from "./pages/applicant/ApplicantDocuments.jsx";
import ApplicantPayments from "./pages/applicant/ApplicantPayments.jsx";
import ApplicantPrintCentre from "./pages/applicant/ApplicantPrintCentre.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminApplications from "./pages/admin/AdminApplications.jsx";
import AdminNews from "./pages/admin/AdminNews.jsx";
import AdminGallery from "./pages/admin/AdminGallery.jsx";
import AdminMessages from "./pages/admin/AdminMessages.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminRoles from "./pages/admin/AdminRoles.jsx";
import AdminAudit from "./pages/admin/AdminAudit.jsx";
import AdminEvents from "./pages/admin/AdminEvents.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminStudents from "./pages/admin/AdminStudents.jsx";
import Events from "./pages/public/Events.jsx";
import Privacy from "./pages/public/Privacy.jsx";
import ChangePassword from "./components/ChangePassword.jsx";
import { RecoveryScreen } from "./components/AppErrorBoundary.jsx";
import { canonicalPortalHref, portalPath, portalScope, retiredPaymentSandbox } from "./api/portalLinks.js";

const StudentLayout = lazy(() => import("./components/StudentLayout.jsx"));
const StudentLogin = lazy(() => import("./pages/student/StudentLogin.jsx"));
const studentPage = (name) => lazy(() => import("./pages/student/StudentPages.jsx").then((module) => ({ default: module[name] })));
const StudentDashboard = studentPage("StudentDashboard");
const StudentProfile = studentPage("StudentProfile");
const StudentAcademic = studentPage("StudentAcademic");
const StudentRecords = studentPage("StudentRecords");
const StudentAnnouncements = studentPage("StudentAnnouncements");
const StudentAnnouncement = studentPage("StudentAnnouncement");
const AdminAcademic = lazy(() => import("./pages/admin/AdminAcademic.jsx"));
const AdminStudentRecord = lazy(() => import("./pages/admin/AdminStudentRecord.jsx"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements.jsx"));
const AdminScreening = lazy(() => import("./pages/admin/AdminScreening.jsx"));
const SchoolFormEditor = lazy(() => import("./components/SchoolFormEditor.jsx"));

export default function App() {
  const scope = portalScope();
  const { pathname, search, hash } = useLocation();
  const destination = canonicalPortalHref(pathname);
  useEffect(() => {
    if (destination) window.location.replace(retiredPaymentSandbox() ? destination : `${destination}${search}${hash}`);
  }, [destination, search, hash]);
  if (destination) return <div className="loading-screen" role="status">Opening your secure portal…</div>;
  return (
    <Suspense fallback={<div className="loading-screen" role="status">Loading your portal…</div>}><Routes>
      {!scope && <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="leadership" element={<Navigate to="/leadership/executive" replace />} />
        <Route path="leadership/:category" element={<Leadership />} />
        <Route path="courses" element={<Courses />} />
        <Route path="admission" element={<Admission />} />
        <Route path="contact" element={<Contact />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="news" element={<News />} />
        <Route path="events" element={<Events />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="apply" element={<Navigate to="/applicant/register" replace />} />
        <Route path="application" element={<Navigate to="/applicant/register" replace />} />
      </Route>}
      {(!scope || scope === "applicant") && <>
      <Route path={portalPath("/applicant/login")} element={<ApplicantAccess />} />
      {scope !== "applicant" && <Route path="/applicant/register" element={<ApplicantAccess />} />}
      <Route
        path={portalPath("/applicant")}
        element={<ProtectedRoute roles={["APPLICANT", "STUDENT"]} transferStudent redirectTo="/applicant/login" entry={scope === "applicant" ? <ApplicantAccess /> : null}><ApplicantTransition /></ProtectedRoute>}
      >
        <Route index element={<ApplicantDashboard />} />
        <Route path="application" element={<ApplicantApplicationForm />} />
        <Route path="documents" element={<ApplicantDocuments />} />
        <Route path="payments" element={<ApplicantPayments />} />
        <Route path="print" element={<ApplicantPrintCentre />} />
        <Route path="security" element={<ChangePassword />} />
        <Route path="school-forms/:kind" element={<SchoolFormEditor />} />
      </Route>
      </>}
      {(!scope || scope === "student") && <>
        {scope !== "student" && <Route path="/student/login" element={<StudentLogin />} />}
        <Route path={portalPath("/student/continue")} element={<StudentContinuation />} />
        <Route path={portalPath("/student")} element={<ProtectedRoute roles={["STUDENT"]} redirectTo="/student/login" entry={scope === "student" ? <StudentLogin /> : null}><StudentLayout /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="academic" element={<StudentAcademic />} />
          <Route path="records" element={<StudentRecords />} />
          <Route path="school-forms/:kind" element={<SchoolFormEditor />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
          <Route path="announcements/:id" element={<StudentAnnouncement />} />
          <Route path="security" element={<ChangePassword embedded />} />
        </Route>
      </>}
      {(!scope || scope === "admin") && <>
      {scope !== "admin" && <Route path="/admin/login" element={<AdminLogin />} />}
      <Route
        path={portalPath("/admin")}
        element={
          <ProtectedRoute roles={["ADMIN"]} entry={scope === "admin" ? <AdminLogin /> : null}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="screening" element={<AdminScreening />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:id" element={<AdminStudentRecord />} />
        <Route path="academic" element={<AdminAcademic />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="security" element={<Navigate to={`${portalPath("/admin/settings")}?tab=security`} replace />} />
      </Route>
      </>}
      <Route path="*" element={<RecoveryScreen title="Page not found" message="This address is not available. Return to the homepage to continue." />} />
    </Routes></Suspense>
  );
}
