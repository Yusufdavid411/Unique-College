import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, LogOut, UserRound, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchool } from "../context/SchoolContext.jsx";
import { assetPaths } from "../data/siteData.js";
import { portalPath, publicPageHref } from "../api/portalLinks.js";

export default function PortalShell({ title, links, children, accountScope = "student" }) {
  const { user, logout } = useAuth();
  const { schoolInfo } = useSchool();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  const drawer = useRef(null);
  const trigger = useRef(null);
  const close = useRef(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => { setMobile(query.matches); setOpen(false); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const keyboard = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const controls = [...drawer.current.querySelectorAll("a[href],button:not(:disabled)")].filter((item) => item.getClientRects().length);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); trigger.current?.focus(); };
  }, [open, mobile]);
  return <div className="student-shell">
    <a className="student-skip" href="#student-main">Skip to content</a>
    {open && mobile && <button className="student-backdrop" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} />}
    <aside id="student-navigation" className={`student-sidebar${open ? " is-open" : ""}`} ref={drawer} inert={mobile && !open ? true : undefined} role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open ? true : undefined} aria-label={`${accountScope} navigation`}>
      <div className="student-brand"><img src={assetPaths.logo} alt="Unique College logo" /><div><strong>{schoolInfo.shortName}</strong><span>{title}</span></div><button type="button" ref={close} className="student-drawer-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <p className="student-nav-label">Your {accountScope} account</p>
      <nav>{links.map(([label, path, Icon]) => <NavLink key={path} to={portalPath(path)} end={path === `/${accountScope}`} onClick={() => setOpen(false)}><Icon size={19} />{label}</NavLink>)}</nav>
      <a className="student-school-link" href={publicPageHref("/", window.location.hostname)} target="_blank" rel="noopener noreferrer">School website <ExternalLink size={15} /></a>
      <button type="button" className="student-logout" onClick={logout}><LogOut size={18} />Sign out</button>
    </aside>
    <div className="student-workspace" inert={open && mobile ? true : undefined}>
      <header className="student-topbar"><button type="button" ref={trigger} className="student-menu-toggle" aria-label={`Open ${accountScope} navigation`} aria-controls="student-navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} /></button><div><strong>{title}</strong><span>{schoolInfo.shortName}</span></div><Link to={portalPath(`/${accountScope}/profile`)} aria-label="Open my profile"><UserRound size={21} /><span>{user.name}</span></Link></header>
      <main id="student-main" className="student-main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
