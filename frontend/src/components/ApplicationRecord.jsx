function RecordFields({ fields }) {
  return <dl className="print-details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>;
}

export default function ApplicationRecord({ application }) {
  return <div className="application-record">
    <h3>A. Personal data</h3><RecordFields fields={[["Full name", application.fullName], ["Date of birth", application.dateOfBirth?.slice(0, 10)], ["Sex", application.gender], ["Marital status", application.maritalStatus], ["Nationality", application.nationality], ["LGA", application.lga], ["State", application.state], ["Email", application.email], ["Phone", application.phoneNumber], ["Postal address", application.postalAddress || application.address], ["Permanent home address", application.permanentAddress]]} />
    <h3>Parent / guardian</h3><RecordFields fields={[["Name", application.guardianName], ["Relationship", application.guardianRelationship], ["Address", application.guardianAddress], ["Phone", application.guardianPhone]]} />
    <h3>B. Programme</h3><p>{application.courseOfInterest || "Not selected"}</p>
    <h3>C. Education</h3><p>Previous qualification: {application.previousQualification || "—"}</p><table><thead><tr><th>Subject</th><th>Grade</th><th>Exam body</th><th>Year</th></tr></thead><tbody>{(application.educationRecords || []).map((record, index) => <tr key={index}><td>{record.subject}</td><td>{record.grade}</td><td>{record.examBody}</td><td>{record.year}</td></tr>)}</tbody></table>
    <h3>D. Sponsorship</h3><RecordFields fields={[["Sponsor name", application.sponsorName], ["Sponsor address", application.sponsorAddress], ["Sponsor phone", application.sponsorPhone]]} />
    <h3>E. Working experience</h3>{application.workExperience?.length ? <table><thead><tr><th>Organisation</th><th>Period</th><th>Reason for leaving</th></tr></thead><tbody>{application.workExperience.map((record, index) => <tr key={index}><td>{record.organization}</td><td>{record.date}</td><td>{record.reasonForLeaving}</td></tr>)}</tbody></table> : <p>No working experience supplied.</p>}
    <h3>F. Declaration</h3><p>{application.declarationAccepted ? "The applicant confirmed that the information supplied is correct to the best of their knowledge and acknowledged that false information may lead to withdrawal of admission." : "Declaration not yet accepted."}</p><RecordFields fields={[["Applicant", application.fullName], ["Submitted", application.submittedAt ? new Date(application.submittedAt).toLocaleString() : "Not submitted"], ["Application reference", application.applicationNumber], ["Form fee quoted", application.formFeeAmount == null ? "Legacy record" : "NGN " + Number(application.formFeeAmount).toFixed(2)]]} />
  </div>;
}
