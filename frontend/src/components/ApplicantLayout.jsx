import { ClipboardList, CreditCard, FileCheck2, LayoutDashboard, LogOut, Printer } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ApplicantProvider } from "../context/ApplicantContext.jsx";
import { assetPaths } from "../data/siteData.js";

const links = [
  ["Overview", "/applicant", LayoutDashboard],
  ["Application form", "/applicant/application", ClipboardList],
  ["Documents", "/applicant/documents", FileCheck2],
  ["Payments", "/applicant/payments", CreditCard],
  ["Print centre", "/applicant/print", Printer],
  ["Account security", "/applicant/security", FileCheck2]
];

export default function ApplicantLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/applicant/login");
  };

  return (
    <ApplicantProvider>
      <div className="applicant-shell">
        <aside className="applicant-sidebar">
        <div className="applicant-brand">
          <img src={assetPaths.logo} alt="Unique College logo" />
          <div><strong>Applicant Portal</strong><span>{user?.name}</span></div>
        </div>
        <nav>
          {links.map(([label, path, Icon]) => (
            <NavLink to={path} end={path === "/applicant"} key={path}><Icon size={19} />{label}</NavLink>
          ))}
        </nav>
        <button type="button" onClick={signOut}><LogOut size={18} />Sign out</button>
        </aside>
        <main className="applicant-main"><Outlet /></main>
      </div>
    </ApplicantProvider>
  );
}
