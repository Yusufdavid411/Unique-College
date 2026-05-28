import { NavLink, Outlet, Link } from "react-router-dom";
import { Mail, MapPin, Menu, Phone } from "lucide-react";
import { useState } from "react";
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

export default function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark image-mark"><img src={assetPaths.logo} alt="Unique College logo" /></span>
          <span>
            <strong>{schoolInfo.shortName}</strong>
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
        <div className="footer-identity">
          <img src={assetPaths.logo} alt="Unique College logo" loading="lazy" />
          <div>
            <strong>{schoolInfo.name}</strong>
            <p>{schoolInfo.motto}. Transforming lives through quality healthcare education.</p>
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
