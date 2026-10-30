import { ClipboardList, CreditCard, FileCheck2, LayoutDashboard, LogOut, Menu, Printer, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ApplicantProvider, useApplicant } from "../context/ApplicantContext.jsx";
import ApplicantProgress from "./ApplicantProgress.jsx";
import { assetPaths } from "../data/siteData.js";
import { portalPath } from "../api/portalLinks.js";
import { useSchool } from "../context/SchoolContext.jsx";

const links = [
  ["Dashboard", "/applicant", LayoutDashboard],
  ["Payment", "/applicant/payments", CreditCard],
  ["Application form", "/applicant/application", ClipboardList],
  ["Documents", "/applicant/documents", FileCheck2],
  ["Print centre", "/applicant/print", Printer],
  ["Account security", "/applicant/security", ShieldCheck]
];

function ApplicantShell() {
  const { schoolInfo } = useSchool();
  const { logout, user } = useAuth();
  const { formAccess, loading } = useApplicant();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 820px)").matches);
  const sidebarRef = useRef(null);
  const closeRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 820px)");
    const update = () => { setMobile(query.matches); setMenuOpen(false); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!menuOpen || !mobile) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab") return;
      const controls = sidebarRef.current?.querySelectorAll("a[href], button:not([disabled])");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (menuRef.current?.isConnected) menuRef.current.focus({ preventScroll: true });
      else if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [menuOpen, mobile]);

  const signOut = () => {
    logout();
    navigate(portalPath("/applicant/login"));
  };

  return (
      <div className={`applicant-shell${menuOpen ? " navigation-open" : ""}`}>
        {menuOpen && mobile && <button className="applicant-backdrop no-print" type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} />}
        <aside id="applicant-sidebar" ref={sidebarRef} className="applicant-sidebar" role={mobile && menuOpen ? "dialog" : undefined} aria-modal={mobile && menuOpen ? true : undefined} aria-labelledby="applicant-sidebar-title" aria-hidden={mobile && !menuOpen ? true : undefined} inert={mobile && !menuOpen ? true : undefined}>
        <div className="applicant-brand">
          <img src={assetPaths.logo} alt="Unique College logo" />
          <div><strong id="applicant-sidebar-title">Applicant Portal</strong><span>{schoolInfo.shortName}</span></div>
          <button ref={closeRef} className="applicant-drawer-close" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={21} /></button>
        </div>
        <p className="applicant-nav-label">Applicant steps</p>
        <nav id="applicant-navigation" aria-label="Applicant navigation">
          {links.map(([label, path, Icon]) => {
            const locked = ["/applicant/application", "/applicant/documents", "/applicant/print"].includes(path) && (loading || !formAccess.unlocked);
            return locked ? <button type="button" disabled key={path} title="Available after payment verification"><Icon size={19} />{label}</button> : <NavLink to={portalPath(path)} end={path === "/applicant"} key={path} onClick={() => setMenuOpen(false)}><Icon size={19} />{label}</NavLink>;
          })}
        </nav>
        <button className="applicant-signout" type="button" aria-label="Sign out" onClick={signOut}><LogOut size={20} /><span>Logout</span></button>
        </aside>
        <div className="applicant-workspace" inert={menuOpen && mobile ? true : undefined}>
          <header className="applicant-topbar no-print">
            <button ref={menuRef} className="applicant-menu-toggle" type="button" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="applicant-sidebar" onClick={() => setMenuOpen(true)}><Menu size={23} /></button>
            <div className="applicant-topbar-title"><strong>Pre-admission portal</strong><span>{schoolInfo.shortName}</span></div>
            <div className="applicant-account"><span className="applicant-account-avatar"><UserRound size={23} /></span><div><strong>{user?.name}</strong><span>Applicant account</span></div></div>
          </header>
          <main className="applicant-main"><ApplicantProgress /><Outlet /></main>
        </div>
      </div>
  );
}

export default function ApplicantLayout() {
  return <ApplicantProvider><ApplicantShell /></ApplicantProvider>;
}
