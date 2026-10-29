import { useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import LoadingButton from "../../components/LoadingButton.jsx";
import PasswordInput from "../../components/PasswordInput.jsx";
import Seo from "../../components/Seo.jsx";
import { apiErrorMessage } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAdmissions } from "../../context/AdmissionsContext.jsx";
import { assetPaths } from "../../data/siteData.js";
import { portalPath, publicPageHref } from "../../api/portalLinks.js";
import { ErrorToast } from "../../components/ToastNotifications.jsx";

export default function ApplicantAccess() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, applicantLogin, registerApplicant } = useAuth();
  const { policy: admissions, unavailable: policyError, loading: policyLoading, refresh } = useAdmissions();
  const isRegister = pathname === "/" || pathname.endsWith("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "", identifier: "", password: "" });

  if (user && ["APPLICANT", "STUDENT"].includes(user.role)) return <Navigate to={portalPath("/applicant")} replace />;
  const checking = authLoading || (isRegister && policyLoading && !admissions);
  const canRegister = !policyError && admissions?.open === true;

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (isRegister && (!canRegister || policyLoading)) return;
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        await registerApplicant({ fullName: form.fullName, email: form.email, phoneNumber: form.phoneNumber, password: form.password });
      } else {
        await applicantLogin(form.identifier, form.password);
      }
      navigate(portalPath("/applicant"));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Your applicant account could not be accessed."));
      if (isRegister && requestError.response?.status === 409) refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title={isRegister ? "Start Application" : "Applicant Login"} description="Unique College secure admissions applicant portal." />
      <div className="applicant-access">
        <section className="applicant-access-story">
          <Link className="applicant-access-brand" to={publicPageHref("/", window.location.hostname)}><img src={assetPaths.logo} alt="Unique College logo" /><span>Unique College</span></Link>
          <div>
            <span className="eyebrow">2026/2027 Admissions</span>
            <h1>Your admission journey, in one secure place.</h1>
            <p>Pay your application fee, complete the official admission form, upload credentials, track every review stage, and download your records.</p>
            <div className="applicant-access-points">
              <span><CheckCircle2 />Save and continue later</span>
              <span><CheckCircle2 />Track review and admission progress</span>
              <span><CheckCircle2 />Print forms, receipts, and admission records</span>
            </div>
          </div>
          <small><ShieldCheck size={16} />Use only this official portal for admission activity.</small>
        </section>

        <section className="applicant-access-panel">
          <div className="applicant-access-card">
            <span className="access-icon"><LockKeyhole size={24} /></span>
            <h2>{isRegister ? "Apply to Unique College" : "Welcome back"}</h2>
            {checking ? <div className="access-availability" role="status" aria-live="polite" aria-busy="true"><p>Confirming portal availability…</p><div className="access-placeholder" /><div className="access-placeholder" /></div> : isRegister && !canRegister ? <div className="access-availability" aria-live="polite">
              <span className="access-status-label">{policyError ? "Please check again" : "Admissions update"}</span>
              <h3>{policyError ? "Admissions status is temporarily unavailable" : "Admissions are currently closed"}</h3>
              <p>{policyError ? "We could not confirm whether new applications are open. Please try again shortly. Existing applicants can still sign in." : admissions?.message || "We are not accepting new applications at the moment."}</p>
              <p>Keep an eye on the school news and announcements to find out when the next admission opens.</p>
              <div className="access-status-actions">{policyError && <button type="button" className="button secondary" onClick={refresh}>Try again</button>}<Link className="button primary" to={publicPageHref("/news", window.location.hostname)}>View school news <ArrowRight size={18} /></Link><Link className="text-link" to={portalPath("/applicant/login")}>Existing applicant? Sign in</Link><Link className="text-link" to={publicPageHref("/", window.location.hostname)}>Return to homepage</Link></div>
            </div> : <>
            <p>{isRegister ? "Create your applicant account before completing the admission form." : "Sign in with your email, application ID, or student portal username."}</p>
            <form onSubmit={submit}>
              {isRegister && (
                <>
                  <label>Full name<input name="fullName" value={form.fullName} onChange={update} required /></label>
                  <label>Phone number<input name="phoneNumber" value={form.phoneNumber} onChange={update} required /></label>
                  <label>Email address<input name="email" type="email" value={form.email} onChange={update} required /></label>
                </>
              )}
              {!isRegister && <label>Email or portal username<input name="identifier" value={form.identifier} onChange={update} required /></label>}
              <label>Password<PasswordInput name="password" autoComplete={isRegister ? "new-password" : "current-password"} value={form.password} onChange={update} minLength="8" required /></label>
              <ErrorToast message={error} />
              <LoadingButton type="submit" loading={busy} disabled={isRegister && policyLoading} loadingText="Please wait...">
                {isRegister ? "Create applicant account" : "Sign in to portal"}<ArrowRight size={18} />
              </LoadingButton>
            </form>
            <p className="access-switch">{isRegister ? "Already started?" : "New applicant?"} <Link to={portalPath(isRegister ? "/applicant/login" : "/applicant/register")}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
            </>}
          </div>
        </section>
      </div>
    </>
  );
}
