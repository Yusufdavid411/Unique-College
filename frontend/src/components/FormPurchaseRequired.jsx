import { Link } from "react-router-dom";

export default function FormPurchaseRequired({ amount }) {
  return <section className="portal-page"><header className="portal-page-header"><div><span className="eyebrow">Purchase application form</span><h1>Your next step</h1><p>The full application form unlocks when your form payment is verified.</p></div></header><div className="portal-alert"><strong>Application form: NGN {Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong><p>Follow the school's official payment instructions and submit evidence. Admissions can verify the payment and unlock your form.</p><Link className="button primary" to="/applicant/payments">Purchase form / Submit payment</Link></div></section>;
}
