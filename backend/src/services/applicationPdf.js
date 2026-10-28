import fs from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const templateUrl = new URL("../../assets/admission-form.pdf", import.meta.url);
const fontUrl = new URL("../../assets/DejaVuSans.ttf", import.meta.url);
let assets;
function loadAssets() {
  if (!assets) assets = Promise.all([fs.readFile(templateUrl), fs.readFile(fontUrl)]);
  return assets;
}

function date(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function fieldWriter(pages, font) {
  const supported = new Set(font.getCharacterSet());
  return (pageIndex, value, x, top, width, label, maxSize = 10) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if ([...text].some((character) => !supported.has(character.codePointAt(0)))) throw Object.assign(new Error(`${label} contains a character the school PDF cannot display. Contact admissions for assistance.`), { statusCode: 422 });
    const measured = font.widthOfTextAtSize(text, maxSize);
    const size = Math.min(maxSize, maxSize * width / Math.max(measured, 1));
    if (size < 6) throw Object.assign(new Error(`${label} is too long to fit the original school form. Shorten this entry before downloading.`), { statusCode: 422 });
    const page = pages[pageIndex];
    page.drawText(text, { x, y: page.getHeight() - top - size, size, font, color: rgb(0, 0, 0) });
  };
}

function addressLines(value) {
  const words = String(value || "").trim().split(/\s+/);
  const midpoint = Math.ceil(words.join(" ").length / 2);
  let split = 0;
  while (split < words.length && words.slice(0, split).join(" ").length < midpoint) split++;
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

const coreSubjects = [/english/i, /math/i, /chemistry/i, /physics/i, /biology|health science/i];

export async function applicationFormPdf(application) {
  const [template, fontBytes] = await loadAssets();
  const document = await PDFDocument.load(template, { updateMetadata: false });
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const pages = document.getPages();
  const write = fieldWriter(pages, font);
  write(0, application.fullName, 144, 177, 390, "Full name");
  write(0, date(application.dateOfBirth), 157, 200, 165, "Date of birth");
  write(0, application.gender, 361, 200, 173, "Sex");
  write(0, application.lga, 125, 223, 102, "LGA");
  write(0, application.state, 265, 223, 98, "State");
  write(0, application.nationality, 423, 223, 111, "Nationality");
  const maritalPosition = { SINGLE: 202, MARRIED: 307, OTHER: 403 }[application.maritalStatus];
  if (maritalPosition) write(0, "X", maritalPosition, 247, 13, "Marital status", 11);
  addressLines(application.postalAddress || application.address).forEach((line, index) => write(0, line, 73, 283 + index * 15, 461, "Postal address"));
  write(0, application.phoneNumber, 215, 321, 319, "Phone number");
  addressLines(application.permanentAddress).forEach((line, index) => write(0, line, 73, 359 + index * 15, 461, "Permanent address"));
  write(0, application.guardianName, 215, 397, 319, "Guardian name");
  write(0, application.guardianAddress, 135, 420, 399, "Guardian address");
  write(0, application.guardianRelationship, 163, 443, 371, "Guardian relationship");
  write(0, application.guardianPhone, 230, 466, 120, "Guardian phone");
  const programme = application.courseOfInterest || "";
  const programmeRows = [/community health/i, /public health/i, /laboratory/i, /pharmacy/i, /information management/i];
  const programmeRow = programmeRows.findIndex((pattern) => pattern.test(programme));
  if (programmeRow >= 0) write(0, "X", 457, 513 + programmeRow * 14.3, 20, "Programme", 11);
  write(0, programme, 73, 589, 461, "Selected programme", 9);
  const records = Array.isArray(application.educationRecords) ? application.educationRecords : [];
  const matched = new Set();
  const subjects = coreSubjects.map((pattern) => {
    const record = records.find((item) => pattern.test(item.subject));
    if (record) matched.add(record);
    return record;
  });
  const additional = records.filter((record) => !matched.has(record) && (record.subject || record.grade || record.examBody || record.year));
  if (additional.length > 4) throw Object.assign(new Error("The school form allows four additional subjects alongside the five core subjects. Check your subject names before downloading."), { statusCode: 422 });
  subjects.push(...additional);
  subjects.forEach((record, index) => {
    if (!record) return;
    const page = index < 4 ? 0 : 1;
    const top = index < 4 ? 650 + index * 14.3 : 50.3 + (index - 4) * 14.3;
    if (index >= 5) write(page, record.subject, 167, top, 108, "Additional subject", 8);
    write(page, record.grade, 284, top, 62, "Subject grade", 9);
    write(page, [record.examBody, record.year].filter(Boolean).join(" / "), 355, top, 178, "Exam body and year", 9);
  });
  write(1, application.sponsorName, 155, 145, 379, "Sponsor name");
  write(1, application.sponsorAddress, 121, 168, 413, "Sponsor address");
  write(1, application.sponsorPhone, 130, 191, 158, "Sponsor phone");
  (Array.isArray(application.workExperience) ? application.workExperience : []).slice(0, 4).forEach((record, index) => {
    const top = 251 + index * 14.3;
    write(1, record.organization, 110, top, 193, "Work organisation", 8);
    write(1, record.date, 309, top, 74, "Work dates", 8);
    write(1, record.reasonForLeaving, 390, top, 144, "Reason for leaving", 8);
  });
  if (application.declarationAccepted) write(1, date(application.submittedAt), 76, 392, 104, "Declaration date");
  write(1, application.applicationReceiptNo, 190, 618, 77, "Application receipt number", 8);
  const decision = ["ACCEPTED", "ADMITTED"].includes(application.status) ? "SELECTED" : application.status === "REJECTED" ? "NOT SELECTED" : "";
  write(1, decision, 481, 618, 57, "Decision", 7);
  write(1, date(application.interviewDate), 170, 637, 97, "Interview date", 8);
  write(1, date(application.dateReceived), 381, 637, 153, "Received date", 8);
  write(1, application.entranceExamScore, 207, 656, 60, "Entrance score", 8);
  write(1, date(application.dateResumed), 379, 656, 155, "Resumption date", 8);
  write(1, application.interviewScore, 235, 675, 32, "Interview score", 8);
  document.setTitle(`Admission application ${application.applicationNumber || ""}`);
  return document.save();
}

export async function paymentReceiptPdf(application, payment) {
  if (payment.status !== "VERIFIED") throw Object.assign(new Error("A payment receipt is available only after payment verification. You can download the original payment evidence separately."), { statusCode: 409 });
  const [template, fontBytes] = await loadAssets();
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const source = await PDFDocument.load(template);
  const header = await document.embedPage(source.getPage(0), { left: 72, bottom: 694, right: 542, top: 778 });
  const page = document.addPage([612, 792]);
  page.drawPage(header, { x: 72, y: 694, width: 470, height: 84 });
  const write = fieldWriter([page], font);
  write(0, payment.type === "APPLICATION_FEE" ? "APPLICATION FORM PAYMENT RECEIPT" : "PAYMENT RECEIPT", 72, 125, 468, "Receipt title", 16);
  const fields = [
    ["Applicant", application.fullName], ["Application number", application.applicationNumber],
    ["Programme", application.courseOfInterest], ["Payment purpose", payment.type.replaceAll("_", " ")],
    ["Amount received", `${payment.currency} ${Number(payment.amount).toFixed(2)}`],
    ["Receipt reference", payment.reference], ["Date paid", date(payment.paidAt || payment.createdAt)],
    ["Date verified", date(payment.verifiedAt)], ["Status", "VERIFIED"]
  ];
  fields.forEach(([label, value], index) => {
    write(0, label, 72, 180 + index * 39, 156, label, 10);
    write(0, value, 235, 180 + index * 39, 300, label, 11);
  });
  write(0, "Payment accepted and verified by the college.", 72, 570, 468, "Receipt note", 10);
  write(0, "This receipt does not constitute an admission offer.", 72, 590, 468, "Receipt note", 10);
  if (process.env.FLUTTERWAVE_MODE === "test") write(0, "TEST PAYMENT - NO REAL MONEY - NOT VALID FOR ADMISSION", 72, 630, 468, "Test payment notice", 11);
  document.setTitle(`Payment receipt ${application.applicationNumber || ""}`);
  return document.save();
}
