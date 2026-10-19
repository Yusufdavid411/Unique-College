import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import LoadingButton from "../../components/LoadingButton.jsx";
import Seo from "../../components/Seo.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { assetPaths } from "../../data/siteData.js";

export default function ApplicantAccess() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, applicantLogin, registerApplicant } = useAuth();
  const isRegister = pathname.endsWith("register");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [admissions, setAdmissions] = useState(null);
  const [policyError, setPolicyError] = useState(false);
  useEffect(() => {
    api.get("/settings/admissions").then((response) => setAdmissions(response.data.data)).catch(() => setPolicyError(true));
  }, []);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "", identifier: "", password: "" });

  if (user && ["APPLICANT", "STUDENT"].includes(user.role)) return <Navigate to="/applicant" replace />;
  if (isRegister && !admissions?.open) return <section className="section"><h1>{policyError ? "Admissions status unavailable" : admissions ? "Admissions closed" : "Checking admissions…"}</h1><p>{policyError ? "Please try again shortly. Existing applicants can still sign in." : admissions?.message}</p><Link className="button" to="/applicant/login">Existing applicant sign in</Link><Link to="/">Return to homepage</Link></section>;

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        await registerApplicant({ fullName: form.fullName, email: form.email, phoneNumber: form.phoneNumber, password: form.password });
      } else {
        await applicantLogin(form.identifier, form.password);
      }
      navigate("/applicant");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Your applicant account could not be accessed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title={isRegister ? "Start Application" : "Applicant Login"} description="Unique College secure admissions applicant portal." />
      <div className="applicant-access">
        <section className="applicant-access-story">
          <Link className="applicant-access-brand" to="/"><img src={assetPaths.logo} alt="Unique College logo" /><span>Unique College</span></Link>
          <div>
            <span className="eyebrow">2026/2027 Admissions</span>
            <h1>Your admission journey, in one secure place.</h1>
            <p>Complete the official application form, upload credentials, submit payment evidence, track every review stage, and print your records.</p>
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
            <h2>{isRegister ? "Start a new application" : "Welcome back"}</h2>
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
              <label>Password<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} minLength="8" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
              {error && <p className="form-status error">{error}</p>}
              <LoadingButton type="submit" loading={busy} loadingText="Please wait...">
                {isRegister ? "Create applicant account" : "Sign in to portal"}<ArrowRight size={18} />
              </LoadingButton>
            </form>
            <p className="access-switch">{isRegister ? "Already started?" : "New applicant?"} <Link to={isRegister ? "/applicant/login" : "/applicant/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
          </div>
        </section>
      </div>
    </>
  );
}
