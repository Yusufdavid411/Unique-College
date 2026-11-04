import { useApplicant } from "../../context/ApplicantContext.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";

export default function ApplicantPrintCentre() {
  const { application, formAccess, loading } = useApplicant();
  if (loading) return <div className="portal-loading">Preparing print centre…</div>;
  if (!application) return <div className="portal-page"><p>Applicant record could not be loaded.</p></div>;
  if (!formAccess.unlocked) return <FormPurchaseRequired amount={formAccess.amount} />;
  return <div className="portal-page"><header className="portal-page-header"><div><span className="eyebrow">Official documents</span><h1>Print centre</h1><p>Print these documents and bring them to the school for submission.</p></div></header><ApplicationDownloads application={application} /></div>;
}
