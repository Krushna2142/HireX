import pdfplumber
import docx
import tempfile

async def parse_resume(file):
    suffix = file.filename.split(".")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{suffix}") as tmp:
        tmp.write(await file.read())
        path = tmp.name

    if suffix == "pdf":
        text = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    if suffix == "docx":
        doc = docx.Document(path)
        return "\n".join(p.text for p in doc.paragraphs)

    return ""