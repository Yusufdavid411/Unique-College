import { useApplicant } from "../../context/ApplicantContext.jsx";
import FlutterwavePayment from "../../components/FlutterwavePayment.jsx";

export default function ApplicantPayments() {
  const { application, loading } = useApplicant();
  if (loading) return <div className="portal-loading">Loading payments…</div>;
  if (!application) return <div className="portal-error">Applicant record could not be loaded.</div>;
  return <FlutterwavePayment />;
}
