import { useState } from "react";
import Seo from "../../components/Seo.jsx";
import { api } from "../../api/client.js";
import { schoolInfo } from "../../data/siteData.js";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState("");

  async function submit(event) {
    event.preventDefault();
    setStatus("Sending...");
    try {
      await api.post("/contacts", form);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      setStatus("Message sent successfully.");
    } catch {
      setStatus("Please check the form and try again.");
    }
  }

  return (
    <>
      <Seo title="Contact" description="Contact Unique College admissions and administration." />
      <section className="page-hero compact"><span className="eyebrow">Contact</span><h1>Speak with admissions and administration.</h1></section>
      <section className="section contact-grid">
        <form className="form-panel" onSubmit={submit}>
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea required placeholder="Message" rows="6" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button className="button primary" type="submit">Send message</button>
          {status && <p className="form-status">{status}</p>}
        </form>
        <div className="location-panel">
          <h2>Location</h2>
          <p>{schoolInfo.address}</p>
          <h2>Email</h2>
          <p>{schoolInfo.email}</p>
          <h2>Phone</h2>
          <p>{schoolInfo.phoneDisplay}</p>
          <h2>Website</h2>
          <p>{schoolInfo.website}</p>
        </div>
      </section>
    </>
  );
}
