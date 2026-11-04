import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "../api/client.js";
import { portalPath } from "../api/portalLinks.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";

export function StudentContinuation() {
  const { completeStudentHandoff } = useAuth();
  const [code] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("code"));
  const [error, setError] = useState("");
  const operation = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    window.history.replaceState(null, "", window.location.pathname);
    if (!code) { setError("The transfer link is missing or expired. Sign in directly."); return; }
    if (!operation.current) operation.current = completeStudentHandoff(code);
    operation.current.then(() => { if (active) navigate(portalPath("/student"), { replace: true }); }).catch((failure) => { if (active) setError(apiErrorMessage(failure, "Sign in to continue.")); });
    return () => { active = false; };
  }, [code, completeStudentHandoff, navigate]);
  return <main className="student-access"><meta name="referrer" content="no-referrer" /><section className="student-access-card"><h1>{error ? "Continue to your student account" : "Completing secure sign-in…"}</h1><ErrorToast message={error} />{error && <Link className="button" to={portalPath("/student/login")}>Student sign-in</Link>}</section></main>;
}
