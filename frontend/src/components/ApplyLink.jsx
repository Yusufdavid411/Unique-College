import { applicationHref } from "../api/portalLinks.js";

export default function ApplyLink({ children, className = "", onClick, label = "Apply now" }) {
  return <a className={`${className} application-link`.trim()} href={applicationHref()} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} onClick={onClick}>{children}</a>;
}
