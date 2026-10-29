import Seo from "../../components/Seo.jsx";

export default function Privacy() {
  return <section className="section privacy-page">
    <Seo title="Website privacy" description="How Unique College measures public website traffic." />
    <span className="eyebrow">Your privacy</span><h1>Website visitor analytics</h1>
    <p>We measure visits to our public website to understand which pages are useful and improve the experience.</p>
    <h2>What we record</h2><p>Page paths, visit dates, broad device categories, and referring website domains. Query strings, URL fragments, form entries and full referring addresses are not stored in the analytics database.</p>
    <p>The server processes your network address to create a protected daily identifier. The analytics database does not retain your raw network address or full browser identification string. The identifier changes each day, so visitor figures are estimates rather than a list of identifiable people.</p>
    <h2>No analytics cookies</h2><p>This visitor counter does not set cookies, use local storage, or connect visits to your applicant or student account. Browser Do Not Track and Global Privacy Control signals are respected.</p>
    <h2>Public pages only</h2><p>Admin, applicant, staff and student portal pages, payments, private documents and passwords are not included in this visitor counter. Separate operational logs may be kept to run and secure those services.</p>
    <h2>Access and retention</h2><p>Only authorised staff can view aggregate reports. Analytics records are kept in a rolling 90-day window; older records are removed when a new visit is recorded. Blocking analytics or network errors may prevent a visit from being counted.</p>
  </section>;
}
