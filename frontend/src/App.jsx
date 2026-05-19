import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import Home from "./pages/public/Home.jsx";
import About from "./pages/public/About.jsx";
import Courses from "./pages/public/Courses.jsx";
import Admission from "./pages/public/Admission.jsx";
import Contact from "./pages/public/Contact.jsx";
import Gallery from "./pages/public/Gallery.jsx";
import News from "./pages/public/News.jsx";
import Application from "./pages/public/Application.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminApplications from "./pages/admin/AdminApplications.jsx";
import AdminNews from "./pages/admin/AdminNews.jsx";
import AdminGallery from "./pages/admin/AdminGallery.jsx";
import AdminMessages from "./pages/admin/AdminMessages.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="courses" element={<Courses />} />
        <Route path="admission" element={<Admission />} />
        <Route path="contact" element={<Contact />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="news" element={<News />} />
        <Route path="apply" element={<Application />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
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
      </Route>
    </Routes>
  );
}
