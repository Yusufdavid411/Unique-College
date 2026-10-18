import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { BriefcaseBusiness, ChevronDown, Crown, GraduationCap, Landmark, Mail, MapPin, Menu, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { assetPaths, schoolInfo } from "../data/siteData.js";

const navItems = [
  ["Home", "/"],
  ["About", "/about"],
  ["Courses", "/courses"],
  ["Admission", "/admission"],
  ["Gallery", "/gallery"],
  ["News", "/news"],
  ["Contact", "/contact"]
];

const leadershipLinks = [
  ["Executive Leadership", "/leadership/executive", Crown],
  ["Governing Board", "/leadership/board", Landmark],
  ["Management Staff", "/leadership/management", BriefcaseBusiness],
  ["Heads of Departments", "/leadership/hods", GraduationCap]
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const [leadershipOpen, setLeadershipOpen] = useState(false);
  const leadershipMenuRef = useRef(null);
  const location = useLocation();
  const isLeadershipRoute = location.pathname.startsWith("/leadership");

  useEffect(() => {
    setOpen(false);
    setLeadershipOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (leadershipMenuRef.current && !leadershipMenuRef.current.contains(event.target)) {
        setLeadershipOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLeadershipOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const closeNavigation = () => {
    setOpen(false);
    setLeadershipOpen(false);
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand" onClick={closeNavigation}>
          <span className="brand-mark image-mark"><img src={assetPaths.logo} alt="Unique College logo" /></span>
          <span>
            <strong>{schoolInfo.shortName}</strong>
            <small>Health Science & Technology</small>
          </span>
        </Link>
        <button
          className="icon-button menu-button"
          type="button"
          onClick={() => {
            setOpen(!open);
            if (open) setLeadershipOpen(false);
          }}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          <Menu size={22} />
        </button>
        <nav className={open ? "main-nav open" : "main-nav"}>
          {navItems.slice(0, 2).map(([label, path]) => (
            <NavLink end={path === "/"} key={path} to={path} onClick={closeNavigation}>{label}</NavLink>
          ))}

          <div className={`nav-dropdown ${leadershipOpen ? "open" : ""}`} ref={leadershipMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isLeadershipRoute ? "active" : ""}`}
              type="button"
              onClick={() => setLeadershipOpen((current) => !current)}
              aria-expanded={leadershipOpen}
              aria-haspopup="menu"
            >
              Leadership <ChevronDown size={15} aria-hidden="true" />
            </button>
            <div className="nav-dropdown-menu" role="menu">
              {leadershipLinks.map(([label, path, Icon]) => (
                <NavLink key={path} to={path} onClick={closeNavigation} role="menuitem">
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {navItems.slice(2).map(([label, path]) => (
            <NavLink key={path} to={path} onClick={closeNavigation}>{label}</NavLink>
          ))}
          <Link className="nav-cta" to="/applicant/register" onClick={closeNavigation}>Applicant Portal</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-identity">
          <img src={assetPaths.logo} alt="Unique College logo" loading="lazy" />
          <div>
            <strong>{schoolInfo.name}</strong>
            <p>{schoolInfo.motto}. Transforming Lives Through Quality Healthcare Education.</p>
          </div>
        </div>
        <div className="footer-contact-list">
          <span><MapPin size={18} />{schoolInfo.address}</span>
          <span><Mail size={18} />{schoolInfo.email}</span>
          <span><Phone size={18} />{schoolInfo.phoneDisplay}</span>
        </div>
      </footer>
    </div>
  );
}
