import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { portalPath, studentPortalHref } from "../api/portalLinks.js";
import { useAuth } from "../context/AuthContext.jsx";
import { clearSession } from "../api/session.js";
import ApplicantLayout from "./ApplicantLayout.jsx";
import { ErrorToast } from "./ToastNotifications.jsx";

export function ApplicantTransition() {
  const { user } = useAuth();
  return user.role === "STUDENT" ? <StudentTransfer /> : <ApplicantLayout />;
}

function StudentTransfer() {
  const operation = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!operation.current) operation.current = api.post("/auth/student/handoff", {}, { withCredentials: true });
    operation.current.then(({ data }) => {
      if (!active) return;
      const target = new URL(data.data.url);
      if (!(target.origin === "https://portal.uniquecollegekwali.com" && target.pathname === "/continue") && !(target.origin === window.location.origin && target.pathname === "/student/continue")) throw new Error("The portal address could not be verified.");
      clearSession("applicant");
      window.location.replace(target.href);
    }).catch((failure) => { if (active) setError(apiErrorMessage(failure, "The student portal transfer could not be completed.")); });
    return () => { active = false; };
  }, []);
  return <main className="student-access"><section className="student-access-card"><span className="eyebrow">Student access</span><h1>Welcome to your next chapter</h1><p>{error ? "Sign in to your student portal using your existing credentials." : "Opening your student portal securely…"}</p><ErrorToast message={error} /><a className="button" href={studentPortalHref()}>Open student portal</a></section></main>;
}

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
