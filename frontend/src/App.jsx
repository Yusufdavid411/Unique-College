import { Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import ApplicantLayout from "./components/ApplicantLayout.jsx";
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
import Events from "./pages/public/Events.jsx";
import ChangePassword from "./components/ChangePassword.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
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
        <Route path="apply" element={<Navigate to="/applicant/register" replace />} />
        <Route path="application" element={<Navigate to="/applicant/register" replace />} />
      </Route>
      <Route path="/applicant/login" element={<ApplicantAccess />} />
      <Route path="/applicant/register" element={<ApplicantAccess />} />
      <Route
        path="/applicant"
        element={<ProtectedRoute roles={["APPLICANT", "STUDENT"]} redirectTo="/applicant/login"><ApplicantLayout /></ProtectedRoute>}
      >
        <Route index element={<ApplicantDashboard />} />
        <Route path="application" element={<ApplicantApplicationForm />} />
        <Route path="documents" element={<ApplicantDocuments />} />
        <Route path="payments" element={<ApplicantPayments />} />
        <Route path="print" element={<ApplicantPrintCentre />} />
        <Route path="security" element={<ChangePassword />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="security" element={<ChangePassword />} />
      </Route>
    </Routes>
  );
}
