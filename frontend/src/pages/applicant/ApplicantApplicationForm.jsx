import { Plus, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, apiErrorMessage } from "../../api/client.js";
import LoadingButton from "../../components/LoadingButton.jsx";
import FormPurchaseRequired from "../../components/FormPurchaseRequired.jsx";
import { useApplicant } from "../../context/ApplicantContext.jsx";
import { programs } from "../../data/siteData.js";

const baseSubjects = ["English Language", "Mathematics", "Chemistry", "Physics", "Biology/Health Science"];

function blankEducation() {
  return baseSubjects.map((subject) => ({ subject, grade: "", examBody: "", year: "" }));
}

function toForm(application) {
  return {
    surname: application?.surname || "",
    firstName: application?.firstName || "",
    middleName: application?.middleName || "",
    gender: application?.gender || "MALE",
    dateOfBirth: application?.dateOfBirth?.slice(0, 10) || "",
    lga: application?.lga || "",
    state: application?.state || "",
    nationality: application?.nationality || "Nigerian",
    maritalStatus: application?.maritalStatus || "SINGLE",
    postalAddress: application?.postalAddress || "",
    permanentAddress: application?.permanentAddress || "",
    guardianName: application?.guardianName || "",
    guardianAddress: application?.guardianAddress || "",
    guardianRelationship: application?.guardianRelationship || "",
    guardianPhone: application?.guardianPhone || "",
    courseOfInterest: application?.courseOfInterest || programs[0].title,
    previousQualification: application?.previousQualification || "",
    educationRecords: application?.educationRecords?.length ? application.educationRecords : blankEducation(),
    sponsorName: application?.sponsorName || "",
    sponsorAddress: application?.sponsorAddress || "",
    sponsorPhone: application?.sponsorPhone || "",
    workExperience: application?.workExperience?.length ? application.workExperience : [],
    declarationAccepted: application?.declarationAccepted || false
  };
}

export default function ApplicantApplicationForm() {
  const { application, formAccess, loading, refresh } = useApplicant();
  const [form, setForm] = useState(() => toForm(null));
  const [busy, setBusy] = useState("");
  const operationInProgress = useRef(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  useEffect(() => { if (application) setForm(toForm(application)); }, [application]);
  if (loading) return <div className="portal-loading">Loading application form...</div>;
  if (!application) return <div className="portal-error">Application record could not be loaded.</div>;
  if (!formAccess.unlocked) return <FormPurchaseRequired amount={formAccess.amount} />;

  const editable = ["DRAFT", "RETURNED"].includes(application.status);
  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const updateEducation = (index, field, value) => setForm((current) => ({ ...current, educationRecords: current.educationRecords.map((record, recordIndex) => recordIndex === index ? { ...record, [field]: value } : record) }));
  const updateWork = (index, field, value) => setForm((current) => ({ ...current, workExperience: current.workExperience.map((record, recordIndex) => recordIndex === index ? { ...record, [field]: value } : record) }));

  async function save() {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setBusy("save");
    setNotice({ type: "", message: "" });
    try {
      await api.patch("/applicant/application", form);
      await refresh();
      setNotice({ type: "success", message: "Your application draft has been saved." });
    } catch (error) {
      setNotice({ type: "error", message: apiErrorMessage(error, "The application could not be saved.") });
    } finally {
      setBusy("");
      operationInProgress.current = false;
    }
  }

  async function submit(event) {
    if (operationInProgress.current || !event.currentTarget.form.reportValidity()) return;
    if (!form.declarationAccepted) {
      setNotice({ type: "error", message: "Please accept the declaration before submitting your application." });
      return;
    }
    operationInProgress.current = true;
    setBusy("submit");
    setNotice({ type: "", message: "" });
    try {
      await api.patch("/applicant/application", form);
      await api.post("/applicant/application/submit");
      await refresh();
      setNotice({ type: "success", message: "Your application has been submitted to the admissions team." });
    } catch (error) {
      const missing = error.response?.data?.data?.missing;
      setNotice({ type: "error", message: missing?.length ? `Complete these items first: ${missing.join(", ")}.` : apiErrorMessage(error, "The application could not be submitted.") });
    } finally {
      setBusy("");
      operationInProgress.current = false;
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page-header"><div><span className="eyebrow">Official admission form</span><h1>Application form</h1><p>Your draft saves to your account. Submit only after confirming every entry.</p></div><span className="application-number">{application.applicationNumber}</span></header>
      {!editable && <div className="portal-alert"><strong>Form locked during review</strong><p>The admissions team will return it if changes are required.</p></div>}
      {notice.message && <p className={`form-status ${notice.type}`}>{notice.message}</p>}

      <form className="portal-form" onSubmit={(event) => event.preventDefault()}>
        <fieldset disabled={!editable}>
          <legend><span>A</span>Personal data</legend>
          <div className="portal-form-grid three"><label>Surname<input name="surname" value={form.surname} onChange={update} required /></label><label>First name<input name="firstName" value={form.firstName} onChange={update} required /></label><label>Middle name (optional)<input name="middleName" value={form.middleName} onChange={update} /></label></div>
          <div className="portal-form-grid three"><label>Date of birth<input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update} required /></label><label>Sex<select name="gender" value={form.gender} onChange={update}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label><label>Marital status<select name="maritalStatus" value={form.maritalStatus} onChange={update}><option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="OTHER">Other</option></select></label></div>
          <div className="portal-form-grid three"><label>LGA<input name="lga" value={form.lga} onChange={update} required /></label><label>State<input name="state" value={form.state} onChange={update} required /></label><label>Nationality<input name="nationality" value={form.nationality} onChange={update} required /></label></div>
          <div className="portal-form-grid"><label>Postal address<textarea name="postalAddress" value={form.postalAddress} onChange={update} rows="3" required /></label><label>Permanent home address<textarea name="permanentAddress" value={form.permanentAddress} onChange={update} rows="3" required /></label></div>
        </fieldset>

        <fieldset disabled={!editable}>
          <legend><span>B</span>Parent or guardian</legend>
          <div className="portal-form-grid"><label>Full name<input name="guardianName" value={form.guardianName} onChange={update} required /></label><label>Relationship<input name="guardianRelationship" value={form.guardianRelationship} onChange={update} required /></label><label>Phone number<input name="guardianPhone" value={form.guardianPhone} onChange={update} required /></label><label>Address<textarea name="guardianAddress" value={form.guardianAddress} onChange={update} rows="2" required /></label></div>
        </fieldset>

        <fieldset disabled={!editable}>
          <legend><span>C</span>Programme and education</legend>
          <div className="portal-form-grid"><label>Course of interest<select name="courseOfInterest" value={form.courseOfInterest} onChange={update}>{programs.map((program) => <option key={program.title}>{program.title}</option>)}</select></label><label>Previous qualification<input name="previousQualification" value={form.previousQualification} onChange={update} placeholder="WAEC, NECO, NABTEB, diploma, or other" /></label></div>
          <div className="education-table">
            <div className="education-row heading"><span>Subject</span><span>Grade</span><span>Exam body</span><span>Year</span><span /></div>
            {form.educationRecords.map((record, index) => (
              <div className="education-row" key={index}>
                <input aria-label={`Subject ${index + 1}`} value={record.subject} onChange={(event) => updateEducation(index, "subject", event.target.value)} required />
                <input aria-label={`Grade ${index + 1}`} value={record.grade} onChange={(event) => updateEducation(index, "grade", event.target.value)} required={index < 5} />
                <select aria-label={`Exam body ${index + 1}`} value={record.examBody} onChange={(event) => updateEducation(index, "examBody", event.target.value)} required={index < 5}><option value="">Select</option><option>WAEC</option><option>NECO</option><option>GCE</option><option>NABTEB</option><option>Other</option></select>
                <input aria-label={`Exam year ${index + 1}`} value={record.year} onChange={(event) => updateEducation(index, "year", event.target.value)} inputMode="numeric" required={index < 5} />
                {index >= 5 && <button type="button" onClick={() => setForm((current) => ({ ...current, educationRecords: current.educationRecords.filter((_, itemIndex) => itemIndex !== index) }))} aria-label="Remove subject"><Trash2 size={17} /></button>}
              </div>
            ))}
          </div>
          {form.educationRecords.length < 9 && <button className="portal-add-button" type="button" onClick={() => setForm((current) => ({ ...current, educationRecords: [...current.educationRecords, { subject: "", grade: "", examBody: "", year: "" }] }))}><Plus size={17} />Add another subject</button>}
        </fieldset>

        <fieldset disabled={!editable}>
          <legend><span>D</span>Sponsorship</legend>
          <div className="portal-form-grid three"><label>Sponsor's name<input name="sponsorName" value={form.sponsorName} onChange={update} /></label><label>Sponsor's phone<input name="sponsorPhone" value={form.sponsorPhone} onChange={update} /></label><label>Sponsor's address<input name="sponsorAddress" value={form.sponsorAddress} onChange={update} /></label></div>
        </fieldset>

        <fieldset disabled={!editable}>
          <legend><span>E</span>Working experience</legend>
          {form.workExperience.map((record, index) => <div className="portal-form-grid work-row" key={index}><label>Organisation<input value={record.organization} onChange={(event) => updateWork(index, "organization", event.target.value)} /></label><label>Date or period<input value={record.date} onChange={(event) => updateWork(index, "date", event.target.value)} /></label><label>Reason for leaving<input value={record.reasonForLeaving} onChange={(event) => updateWork(index, "reasonForLeaving", event.target.value)} /></label><button type="button" onClick={() => setForm((current) => ({ ...current, workExperience: current.workExperience.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={17} /></button></div>)}
          {form.workExperience.length < 4 && <button className="portal-add-button" type="button" onClick={() => setForm((current) => ({ ...current, workExperience: [...current.workExperience, { organization: "", date: "", reasonForLeaving: "" }] }))}><Plus size={17} />Add work experience</button>}
        </fieldset>

        <fieldset disabled={!editable}>
          <legend><span>F</span>Declaration</legend>
          <label className="declaration-check"><input name="declarationAccepted" type="checkbox" checked={form.declarationAccepted} onChange={update} /><span>I declare that the information supplied is correct to the best of my knowledge. I understand that false information may lead to the withdrawal of admission.</span></label>
        </fieldset>

        {editable && <div className="portal-form-actions"><LoadingButton type="button" className="button secondary" loading={busy === "save"} disabled={Boolean(busy)} loadingText="Saving..." onClick={save}><Save size={18} />Save draft</LoadingButton><LoadingButton type="button" loading={busy === "submit"} disabled={Boolean(busy)} loadingText="Submitting..." onClick={submit}><Send size={18} />Submit for review</LoadingButton></div>}
      </form>
    </div>
  );
}
