import fs from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fieldWriter } from "./applicationPdf.js";

const templates = { LETTER: "letter", ACCEPTANCE: "acceptance", GUARANTOR: "guarantor", STUDENT_RECORD: "student-record" };
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)) : "";
async function template(kind) {
  const document = await PDFDocument.load(await fs.readFile(new URL(`../../assets/school-${templates[kind]}.pdf`, import.meta.url)), { updateMetadata: false });
  document.registerFontkit(fontkit);
  const font = await document.embedFont(await fs.readFile(new URL("../../assets/DejaVuSans.ttf", import.meta.url)), { subset: true });
  return { document, font, page: document.getPage(0), write: fieldWriter(document.getPages(), font) };
}
function testNotice(page, font, application) {
  if (application.isTest) page.drawText("TEST DOCUMENT - NOT VALID FOR REAL ADMISSION", { x: 72, y: 16, size: 9, font, color: rgb(0.7, 0.1, 0.1) });
}
function linesFor(text, font, size, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (font.widthOfTextAtSize(word, size) > width) throw Object.assign(new Error("A letter entry is too long for the school's original layout."), { statusCode: 422 });
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
export async function admissionLetterPdf(application, letter) {
  const { document, page, font, write } = await template("LETTER");
  const details = letter.snapshot;
  write(0, details.reference, 72, 205, 270, "Admission reference", 10);
  write(0, date(letter.issuedAt).toUpperCase(), 415, 205, 140, "Issue date", 10);
  write(0, details.fullName.toUpperCase(), 72, 220, 480, "Student name", 11);
  const paragraphs = [
    `I write to inform you that you have been offered a provisional admission to study ${details.programme.toUpperCase()} at Unique College of Health Science and Technology, Kwali on Full - Time basis. Your programme will last for duration of ${details.duration}. The provisional admission takes effect from ${date(details.effectiveDate)}, ${details.session} Academic Session.`,
    `3. You are required to submit your ‘O’ level result on/before ${date(details.resultDeadline)}.`,
    `4. Registration and payment commences on ${date(details.registrationOpen)}. Admission elapses if payment and registration are not completed before ${date(details.registrationDeadline)}.`,
    `7. Lectures will commence on ${date(details.lecturesStart)}.`
  ];
  for (const [index, top, maximumLines] of [[0, 263, 4], [1, 364, 1], [2, 384, 2], [3, 525, 1]]) {
    let size = 10.5;
    let lines = linesFor(paragraphs[index], font, size, 481);
    while (lines.length > maximumLines && size > 9) { size -= 0.25; lines = linesFor(paragraphs[index], font, size, 481); }
    if (lines.length > maximumLines) throw Object.assign(new Error("The letter entry does not fit its original school layout. Shorten the programme or duration wording."), { statusCode: 422 });
    lines.forEach((line, lineIndex) => write(0, line, 72, top + lineIndex * 20, 481, "Letter text", size));
  }
  testNotice(page, font, application);
  if (details.feeScheduleApproved) {
    const appendix = await PDFDocument.load(await fs.readFile(new URL("../../assets/school-fees.pdf", import.meta.url)));
    const [fees] = await document.copyPages(appendix, [0]);
    document.addPage(fees);
    testNotice(fees, font, application);
  }
  document.setTitle("Provisional admission letter");
  return document.save();
}

export async function schoolFormPdf(application, form, details, studentProfile) {
  const { document, page, font, write } = await template(form.kind);
  const data = form.data;
  const put = (value, x, top, width, label, size = 9) => write(0, value, x, top - (form.kind === "STUDENT_RECORD" ? 4 : 1.5), width, label, size);
  if (form.kind === "ACCEPTANCE") {
    put(application.applicationNumber, 173, 144, 180, "Application number");
    put(data.surname ?? (application.surname || application.fullName), 118, 164, 235, "Surname");
    put(data.firstName ?? application.firstName, 132, 184, 220, "First name");
    put(data.middleName ?? application.middleName, 143, 204, 220, "Middle name");
    put(data.contactAddress, 156, 224, 205, "Contact address");
    put(details.session, 201, 285, 148, "Session");
    put(details.programme, 74, 365, 435, "Programme");
    put(date(form.submittedAt), 102, 426, 117, "Date");
    page.drawLine({ start: { x: 229.5, y: 462 }, end: { x: 254.5, y: 462 }, thickness: 0.8, color: rgb(0, 0, 0) });
  } else if (form.kind === "GUARANTOR") {
    put(application.fullName, 187, 164, 200, "Student name");
    put(details.programme, 160, 184, 225, "Programme");
    put(details.department || details.programme, 163, 204, 222, "Department");
    put(date(form.submittedAt), 276, 224, 110, "Date");
    put(data.guarantorName, 137, 305, 180, "Guarantor name");
    put(data.guarantorCapacity, 129, 318, 194, "Guarantor description");
    put(data.guarantorAddress, 109, 345, 440, "Guarantor address");
    put(data.relationship, 229, 372, 280, "Relationship");
    put(data.undertakingName, 139, 392, 400, "Undertaking name");
    put(application.fullName, 148, 433, 102, "Student name", 8);
    put(details.department || details.programme, 341, 433, 198, "Department", 8);
    put(data.signedDay, 278, 473, 64, "Signing day");
    put(data.signedMonth, 381, 473, 44, "Signing month", 8);
    put(data.signedYear, 458, 473, 39, "Signing year", 8);
    put(data.presenceOf, 121, 493, 141, "Person present");
    put(data.witnessName, 142, 533, 192, "Witness name");
    put(data.witnessAddress, 151, 553, 186, "Witness address");
  } else {
    put(application.fullName, 155, 141, 354, "Student name");
    put(application.studentNumber, 212, 182, 285, "Student number");
    put(details.programme, 231, 202, 268, "Programme");
    put(date(form.submittedAt), 183, 222, 66, "Registered date", 8);
    put(studentProfile?.phoneNumber || application.phoneNumber, 306, 222, 85, "Phone", 8);
    put(application.email, 425, 222, 87, "Email", 8);
    put(data.state, 167, 242, 78, "State", 8); put(data.lga, 290, 242, 61, "LGA", 8); put(data.tribe, 403, 242, 92, "Tribe", 8);
    put(data.placeOfBirth, 188, 262, 173, "Place of birth"); put(date(application.dateOfBirth), 449, 262, 53, "Birth date", 7);
    put(application.gender, 157, 282, 135, "Gender"); put(data.maritalStatus, 393, 282, 106, "Marital status");
    for (const [key, x, top, width] of [["fatherName", 200, 323, 300], ["fatherOfficeAddress", 196, 343, 305], ["fatherResidentialAddress", 237, 383, 260], ["fatherEmail", 205, 403, 292], ["fatherOfficePhone", 211, 423, 132], ["fatherMobile", 404, 423, 93], ["sponsorName", 207, 443, 290], ["sponsorOfficeAddress", 194, 463, 304], ["sponsorResidentialAddress", 237, 503, 262], ["sponsorEmail", 205, 523, 292], ["sponsorOfficePhone", 211, 543, 130], ["sponsorMobile", 404, 543, 93], ["permanentAddress", 255, 564, 245]]) put(data[key], x, top, width, key, 8);
  }
  testNotice(page, font, application);
  return document.save();
}
