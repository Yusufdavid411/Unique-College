import PrivateFilePreview from "./PrivateFilePreview.jsx";

const formLabels = { ACCEPTANCE: "Acceptance form", GUARANTOR: "Guarantor’s form", STUDENT_RECORD: "Student record form" };
const feeLabels = { APPLICATION_FEE: "Application form fee", SCREENING_FEE: "Screening fee", ACCEPTANCE_FEE: "Acceptance fee" };
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

function DocumentGroup({ title, documents }) {
  if (!documents.length) return null;
  return <div className="record-download-group">
    <h3>{title}</h3>
    <ul>{documents.map(({ label, amount, endpoint, filename, unavailable }) => <li key={endpoint || label}>
      <div><strong>{label}</strong>{amount != null && <small>{currency.format(amount)}</small>}</div>
      {unavailable ? <span className="portal-status">Awaiting release by Admissions</span> : <PrivateFilePreview endpoint={endpoint} filename={filename} label={amount == null ? label : `${label} receipt`} buttonText="View PDF" allowDownload />}
    </li>)}</ul>
  </div>;
}

export default function ApplicationDownloads({ application }) {
  const name = (application.applicationNumber || application.id).replace(/[^a-zA-Z0-9-]/g, "-");
  const base = `/records/applications/${application.id}`;
  const applicationForms = ["ACCEPTED", "ADMITTED"].includes(application.status)
    ? [{ label: "Application form", endpoint: `${base}/form`, filename: `${name}-application-form.pdf` }] : [];
  const schoolForms = (application.schoolForms || []).filter((form) => form.status === "SUBMITTED" && formLabels[form.kind]).map((form) => ({
    label: formLabels[form.kind], endpoint: `${base}/documents/${form.kind}`, filename: `${name}-${form.kind.toLowerCase().replaceAll("_", "-")}.pdf`
  }));
  if (application.admissionLetters?.length) schoolForms.unshift({ label: "Admission letter", endpoint: `${base}/documents/LETTER`, filename: `${name}-admission-letter.pdf` });
  else if (["ACCEPTED", "ADMITTED"].includes(application.status)) schoolForms.unshift({ label: "Admission letter", unavailable: true });
  const receipts = (application.payments || []).filter((payment) => payment.status === "VERIFIED").map((payment) => ({
    label: feeLabels[payment.type] || payment.type.replaceAll("_", " "), amount: Number(payment.amount),
    endpoint: `${base}/payments/${payment.id}/receipt`, filename: `${name}-${payment.id}-receipt.pdf`
  }));
  return <section className="record-downloads no-print" aria-label="Available documents">
    <DocumentGroup title="Application documents" documents={applicationForms} />
    <DocumentGroup title="Admission letter & school forms" documents={schoolForms} />
    <DocumentGroup title="Payment receipts" documents={receipts} />
    {!applicationForms.length && !schoolForms.length && !receipts.length && <p>No documents available yet.</p>}
  </section>;
}
