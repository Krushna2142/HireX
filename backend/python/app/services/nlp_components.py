import re
from typing import List, Dict, Tuple
import spacy
from spacy.language import Language
from spacy.tokens import Doc, Span

SECTION_HEADERS = [
    "summary", "objective", "profile",
    "experience", "work experience", "professional experience",
    "projects", "personal projects",
    "education",
    "skills", "technical skills", "tech stack",
    "certifications",
    "achievements",
    "publications",
]

HEADER_REGEXES = [
    re.compile(r"^\s*(summary|objective|profile)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(work\s+experience|experience|professional\s+experience)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(projects|personal\s+projects)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(education)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(skills|technical\s+skills|tech\s+stack)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(certifications)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(achievements)\s*[:\-]?\s*$", re.I),
    re.compile(r"^\s*(publications)\s*[:\-]?\s*$", re.I),
]

# Register a custom extension on Doc for section spans
if not Doc.has_extension("sections"):
    Doc.set_extension("sections", default=[])

@Language.factory("section_header_detector")
def create_section_header_detector(nlp: Language, name: str):
    def pipe(doc: Doc) -> Doc:
        # naive line split by newline; map line indices to char positions
        text = doc.text
        lines = text.splitlines()
        offsets = []
        pos = 0
        for ln in lines:
            offsets.append((pos, pos + len(ln)))
            pos += len(ln) + 1  # account for newline

        sections: List[Tuple[str, int, int]] = []
        current_header = None
        current_start = 0

        for i, ln in enumerate(lines):
            is_header = False
            header_name = None
            for rx in HEADER_REGEXES:
                if rx.match(ln.strip()):
                    is_header = True
                    header_name = rx.pattern.split("\\s*")[2].split("|")[0] if header_name is None else header_name
                    break

            if is_header:
                # close previous section
                if current_header is not None:
                    sections.append((current_header, current_start, offsets[i][0]))
                current_header = ln.strip().lower()
                current_start = offsets[i][1] + 1  # start after header line
        # append last section if any
        if current_header is not None:
            sections.append((current_header, current_start, len(text)))

        # normalize header names and save spans
        spans: List[Span] = []
        for hname, start, end in sections:
            # map header to canonical
            canonical = canonical_header(hname)
            span = doc.char_span(start, end, label=canonical)
            if span is not None:
                spans.append(span)
        doc._.sections = spans
        return doc
    return pipe

def canonical_header(hname: str) -> str:
    h = hname.lower()
    mapping = {
        "summary": "SUMMARY",
        "objective": "SUMMARY",
        "profile": "SUMMARY",
        "work experience": "EXPERIENCE",
        "experience": "EXPERIENCE",
        "professional experience": "EXPERIENCE",
        "projects": "PROJECTS",
        "personal projects": "PROJECTS",
        "education": "EDUCATION",
        "skills": "SKILLS",
        "technical skills": "SKILLS",
        "tech stack": "SKILLS",
        "certifications": "CERTIFICATIONS",
        "achievements": "ACHIEVEMENTS",
        "publications": "PUBLICATIONS",
    }
    return mapping.get(h, h.upper())