import { ClipboardList, CreditCard, FileCheck2, LayoutDashboard, LogOut, Menu, Printer, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ApplicantProvider, useApplicant } from "../context/ApplicantContext.jsx";
import ApplicantProgress from "./ApplicantProgress.jsx";
import { assetPaths } from "../data/siteData.js";

const links = [
  ["Overview", "/applicant", LayoutDashboard],
  ["Application form", "/applicant/application", ClipboardList],
  ["Documents", "/applicant/documents", FileCheck2],
  ["Payments", "/applicant/payments", CreditCard],
  ["Print centre", "/applicant/print", Printer],
  ["Account security", "/applicant/security", FileCheck2]
];

function ApplicantShell() {
  const { logout, user } = useAuth();
  const { formAccess, loading } = useApplicant();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/applicant/login");
  };

  return (
      <div className="applicant-shell">
        <aside className="applicant-sidebar">
        <div className="applicant-brand">
          <img src={assetPaths.logo} alt="Unique College logo" />
          <div><strong>Applicant Portal</strong><span>{user?.name}</span></div>
        </div>
        <button className="applicant-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="applicant-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}<span>Menu</span></button>
        <nav id="applicant-navigation" aria-label="Applicant navigation" className={menuOpen ? "is-open" : ""}>
          {links.map(([label, path, Icon]) => {
            const locked = ["/applicant/application", "/applicant/documents", "/applicant/print"].includes(path) && (loading || !formAccess.unlocked);
            return locked ? <button type="button" disabled key={path} title="Available after payment verification"><Icon size={19} />{label}<span className="applicant-lock-label">Locked</span></button> : <NavLink to={path} end={path === "/applicant"} key={path} onClick={() => setMenuOpen(false)}><Icon size={19} />{label}</NavLink>;
          })}
        </nav>
        <button className="applicant-signout" type="button" aria-label="Sign out" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
        </aside>
        <main className="applicant-main"><ApplicantProgress /><Outlet /></main>
      </div>
  );
}

export default function ApplicantLayout() {
  return <ApplicantProvider><ApplicantShell /></ApplicantProvider>;
}
