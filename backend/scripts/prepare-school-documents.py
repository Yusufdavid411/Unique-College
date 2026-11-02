import argparse
from pathlib import Path
import pymupdf as fitz

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("output")
arguments = parser.parse_args()
source = fitz.open(arguments.source)
if len(source) != 5:
    raise ValueError("The approved school pack must contain exactly five pages")
output = Path(arguments.output)
output.mkdir(parents=True, exist_ok=True)
for name, page_index in [("letter", 0), ("fees", 1), ("acceptance", 2), ("guarantor", 3), ("student-record", 4)]:
    document = fitz.open()
    document.insert_pdf(source, from_page=page_index, to_page=page_index)
    document.set_metadata({})
    if name == "letter":
        page = document[0]
        for rectangle in [(70, 202, 555, 233), (70, 260, 557, 337), (70, 362, 557, 379), (70, 381, 557, 419), (70, 521, 557, 540)]:
            page.add_redact_annot(fitz.Rect(rectangle), fill=(1, 1, 1))
        page.apply_redactions(images=0, graphics=0)
    destination = output / f"school-{name}.pdf"
    document.save(destination, garbage=4, deflate=True, clean=True)
    document.close()
    verified = fitz.open(destination)
    if "DANIEL" in "".join(page.get_text() for page in verified).upper() or "0206" in "".join(page.get_text() for page in verified):
        raise ValueError("A sample applicant identifier remains in the template")
    verified.close()
    print(f"Prepared generic {name} template")
