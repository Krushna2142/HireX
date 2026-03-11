"""
Resume parser — extracts text from PDF and DOCX.
Real parsing, no static data.
"""
import pdfplumber
import docx
import tempfile
import os


def parse_resume_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Parse resume bytes into plain text."""
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{suffix}") as tmp:
        tmp.write(file_bytes)
        path = tmp.name

    try:
        if suffix == "pdf":
            return _parse_pdf(path)
        elif suffix == "docx":
            return _parse_docx(path)
        else:
            return ""
    finally:
        os.unlink(path)


def _parse_pdf(path: str) -> str:
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"
    return text.strip()


def _parse_docx(path: str) -> str:
    doc = docx.Document(path)
    return "\n".join(p.text for p in doc.paragraphs).strip()