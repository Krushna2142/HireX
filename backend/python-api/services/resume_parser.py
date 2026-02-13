import pdfplumber
import docx


def parse_resume(file_path: str) -> str:
    if file_path.endswith(".pdf"):
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    if file_path.endswith(".docx"):
        document = docx.Document(file_path)
        return "\n".join([p.text for p in document.paragraphs])

    return "Unsupported file format"
