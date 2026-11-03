import { useApplicant } from "../../context/ApplicantContext.jsx";
import ApplicationDownloads from "../../components/ApplicationDownloads.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";

export default function ApplicantPrintCentre() {
  const { application, formAccess, loading } = useApplicant();
  if (loading) return <div className="portal-loading">Preparing print centre…</div>;
  if (!application) return <div className="portal-page"><p>Applicant record could not be loaded.</p></div>;
  if (!formAccess.unlocked) return <FormPurchaseRequired amount={formAccess.amount} />;
  return <div className="portal-page"><header className="portal-page-header"><div><span className="eyebrow">Official documents</span><h1>Print centre</h1><p>Download each official document separately. Application forms require acceptance by admissions; admission letters require confirmed acceptance payment and release. Verified payments have their own receipts.</p></div></header><ApplicationDownloads application={application} /></div>;
}
