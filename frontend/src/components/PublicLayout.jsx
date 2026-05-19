import { NavLink, Outlet, Link } from "react-router-dom";
import { GraduationCap, Menu, Phone } from "lucide-react";
import { useState } from "react";

const navItems = [
  ["Home", "/"],
  ["About", "/about"],
  ["Courses", "/courses"],
  ["Admission", "/admission"],
  ["Gallery", "/gallery"],
  ["News", "/news"],
  ["Contact", "/contact"]
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><GraduationCap size={24} /></span>
          <span>
            <strong>Unique College</strong>
            <small>Health Science & Technology</small>
          </span>
        </Link>
        <button className="icon-button menu-button" type="button" onClick={() => setOpen(!open)} aria-label="Open navigation">
          <Menu size={22} />
        </button>
        <nav className={open ? "main-nav open" : "main-nav"}>
          {navItems.map(([label, path]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <Link className="nav-cta" to="/apply" onClick={() => setOpen(false)}>Apply</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>
          <strong>Unique College of Health Science and Technology</strong>
          <p>Modern healthcare education with practical, technology-ready training.</p>
        </div>
        <div className="footer-contact">
          <Phone size={18} />
          <span>+234 800 000 0000</span>
        </div>
      </footer>
    </div>
  );
}
