import PrivateFileButton from "./PrivateFileButton.jsx";

export default function ApplicationDownloads({ application }) {
  const name = (application.applicationNumber || application.id).replace(/[^a-zA-Z0-9-]/g, "-");
  const payments = (application.payments || []).filter((payment) => payment.status !== "CANCELLED");
  return <section className="record-downloads no-print" aria-label="Application downloads">
    <div><h3>Application form</h3><p>The original school form, completed with your application details.</p><PrivateFileButton endpoint={`/records/applications/${application.id}/form`} filename={`${name}-application-form.pdf`}>Download application form (PDF)</PrivateFileButton></div>
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
