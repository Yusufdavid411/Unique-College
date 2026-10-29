import PrivateFileButton from "./PrivateFileButton.jsx";

export default function ApplicationDownloads({ application }) {
  const name = (application.applicationNumber || application.id).replace(/[^a-zA-Z0-9-]/g, "-");
  const payments = (application.payments || []).filter((payment) => payment.status !== "CANCELLED");
  const accepted = ["ACCEPTED", "ADMITTED"].includes(application.status);
  return <section className="record-downloads no-print" aria-label="Application downloads">
    <div><h3>Application form</h3>{accepted ? <><p>Your accepted application on the school's original form.</p><PrivateFileButton endpoint={`/records/applications/${application.id}/form`} filename={`${name}-application-form.pdf`}>Download application form (PDF)</PrivateFileButton></> : <p>The application PDF becomes available after the admissions office accepts your submitted form.</p>}</div>
    <div><h3>Payment receipts</h3><p>Receipts are downloaded separately after payment verification.</p>
      {!payments.length && <p>No payments recorded.</p>}
      {payments.map((payment) => <div className="record-download-payment" key={payment.id}>
        <strong>{payment.type.replaceAll("_", " ")} · NGN {Number(payment.amount).toLocaleString()}</strong>
        {payment.status === "VERIFIED" ? <PrivateFileButton endpoint={`/records/applications/${application.id}/payments/${payment.id}/receipt`} filename={`${name}-${payment.id}-receipt.pdf`}>Download payment receipt (PDF)</PrivateFileButton> : <span>{payment.status === "REJECTED" ? "Receipt not approved" : "Awaiting payment verification"}</span>}
        {payment.proofPath && <PrivateFileButton path={payment.proofPath}>Download uploaded payment evidence</PrivateFileButton>}
      </div>)}
    </div>
  </section>;
}
