import fs from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export async function courseRegistrationPdf(registration) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await fs.readFile(new URL("../../assets/DejaVuSans.ttf", import.meta.url)));
  let page;
  let position;
  const line = (text, size = 10) => {
    if (!page || position < 55) { page = pdf.addPage([595, 842]); position = 790; }
    const words = String(text).split(/\s+/);
    let textLine = "";
    for (const word of words) {
      const next = textLine ? textLine + " " + word : word;
      if (font.widthOfTextAtSize(next, size) > 495) { page.drawText(textLine, { x: 50, y: position, size, font, color: rgb(0.03, 0.17, 0.25) }); position -= size + 7; textLine = word; }
      else textLine = next;
    }
    page.drawText(textLine, { x: 50, y: position, size, font }); position -= size + 9;
  };
  const { enrolment } = registration;
  line("Unique College of Health Science and Technology", 15);
  line("Approved course registration", 13);
  line(enrolment.student.user.name);
  line("Student number: " + (enrolment.student.application.studentNumber || "Not assigned"));
  line(enrolment.programme.name + " | " + enrolment.session.name + " | " + enrolment.level.name);
  line("Semester: " + registration.semester + " | Status: " + registration.status);
  line("Approved: " + new Date(registration.reviewedAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" }));
  for (const item of registration.items) line(item.code + " - " + item.title + " - " + item.creditUnits + " units");
  line("Total credit units: " + registration.items.reduce((sum, item) => sum + item.creditUnits, 0), 12);
  return pdf.save();
}
