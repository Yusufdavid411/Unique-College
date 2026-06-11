import { useState } from "react";
import Seo from "../../components/Seo.jsx";
import LoadingButton from "../../components/LoadingButton.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { programs } from "../../data/siteData.js";

const initial = {
  fullName: "",
  email: "",
  phoneNumber: "",
  gender: "MALE",
  dateOfBirth: "",
  address: "",
  state: "",
  courseOfInterest: programs[0].title
};

export default function Application() {
  const [form, setForm] = useState(initial);
  const [passport, setPassport] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity() || !passport) {
      setStatus({ type: "error", message: "Please complete every required field and upload a passport photograph." });
      return;
    }

    setStatus({ type: "info", message: "Submitting application..." });
    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    data.append("passport", passport);

    try {
      await api.post("/applications", data);
      setForm(initial);
      setPassport(null);
      event.currentTarget.reset();
      setStatus({
        type: "success",
        message:
          "Application submitted. Please keep an eye on your email and phone. If your application is accepted, the admissions team will contact you with the next steps."
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: apiErrorMessage(error, "Application could not be submitted. Please review the form and try again.")
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Application" description="Submit your Unique College student application online." />
      <section className="page-hero compact"><span className="eyebrow">Application</span><h1>Submit your student application.</h1></section>
      <section className="section narrow">
        <form className="form-panel application-form" onSubmit={submit}>
          <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required placeholder="Phone number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <input required type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          <input required placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <select value={form.courseOfInterest} onChange={(e) => setForm({ ...form, courseOfInterest: e.target.value })}>
            {programs.map((program) => <option key={program.title}>{program.title}</option>)}
          </select>
          <textarea required placeholder="Address" rows="4" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <label className="file-field">Passport photograph<input required accept="image/png,image/jpeg,image/webp" type="file" onChange={(e) => setPassport(e.target.files?.[0] || null)} /></label>
          <LoadingButton type="submit" loading={submitting} loadingText="Submitting application...">
            Submit application
          </LoadingButton>
          {status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
        </form>
      </section>
    </>
  );
}
