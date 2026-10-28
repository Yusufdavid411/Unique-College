import { Link } from "react-router-dom";
import { portalPath } from "../api/portalLinks.js";
import { useApplicant } from "../context/ApplicantContext.jsx";

export default function FormPurchaseRequired({ amount }) {
  const { paymentGateway } = useApplicant();
  if (paymentGateway.provider === "FLUTTERWAVE") return <section className="portal-page"><div className="portal-alert"><strong>Purchase your application form</strong><p>Pay NGN {Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })} securely with Flutterwave. Your form opens automatically after payment verification.</p><Link className="button primary" to={portalPath("/applicant/payments")}>Pay application fee</Link></div></section>;
  return <section className="portal-page"><header className="portal-page-header"><div><span className="eyebrow">Purchase application form</span><h1>Your next step</h1><p>The full application form unlocks when your form payment is verified.</p></div></header><div className="portal-alert"><strong>Application form: NGN {Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong><p>Follow the school's official payment instructions and submit evidence. Admissions can verify the payment and unlock your form.</p><Link className="button primary" to={portalPath("/applicant/payments")}>Purchase form / Submit payment</Link></div></section>;
}
