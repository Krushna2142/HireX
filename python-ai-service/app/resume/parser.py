# python-ai-service/app/resume/parser.py
import re
import spacy
from io import BytesIO
import fitz
from docx import Document
from app.shared.schemas import PersonalInfo, ResumeAnalysisResponse, ResumeProject
from app.shared.text_cleaner import clamp, normalize_text

# Load local statistical NLP model (Run: python -m spacy download en_core_web_sm)
nlp = spacy.load("en_core_web_sm")

# Generic nouns to ignore when extracting skills
STOP_NOUNS = {"experience", "skill", "work", "team", "company", "university", 
              "college", "degree", "project", "role", "responsibility", "year", "month"}

_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _docx_part_text(root) -> str:
    """
    Extract text from a WordprocessingML element tree in *document order*.

    python-docx's ``Document.paragraphs`` only returns top-level body paragraphs, so
    anything inside a table (very common in two-column / template resumes), a nested
    table, a text box, a header or a footer is silently dropped. Walking every
    ``w:t`` run from the XML root catches all of those.

    Text is grouped by its *nearest* ``w:p`` ancestor (so text-box paragraphs are not
    duplicated into the paragraph that anchors the box), and ``mc:Fallback`` branches
    are skipped (Word stores text boxes twice: DrawingML + VML fallback).
    """
    w = f"{{{_W_NS}}}"
    fallback_tag = "{http://schemas.openxmlformats.org/markup-compatibility/2006}Fallback"
    order: list = []
    buckets: dict = {}

    for node in root.iter(w + "t", w + "tab", w + "br", w + "cr"):
        # nearest paragraph + fallback check
        para = None
        in_fallback = False
        anc = node.getparent()
        while anc is not None:
            if anc.tag == fallback_tag:
                in_fallback = True
                break
            if para is None and anc.tag == w + "p":
                para = anc
            anc = anc.getparent()
        if in_fallback or para is None:
            continue
        if para not in buckets:
            buckets[para] = []
            order.append(para)
        if node.tag == w + "t":
            if node.text:
                buckets[para].append(node.text)
        elif node.tag == w + "tab":
            buckets[para].append(" ")
        else:
            buckets[para].append("\n")

    lines = ["".join(buckets[p]).strip() for p in order]
    return "\n".join(line for line in lines if line)


def extract_docx_text(content: bytes) -> str:
    """Body + tables + text boxes + headers/footers of a .docx, in document order."""
    document = Document(BytesIO(content))
    chunks = [_docx_part_text(document.element.body)]
    for section in document.sections:
        for part in (section.header, section.footer, section.first_page_header, section.first_page_footer):
            try:
                if part is not None and not part.is_linked_to_previous:
                    txt = _docx_part_text(part._element)
                    if txt:
                        chunks.append(txt)
            except Exception:
                continue
    return "\n".join(c for c in chunks if c)


def extract_text_from_file(content: bytes, filename: str, content_type: str | None = None) -> str:
    name = filename.lower()
    if name.endswith(".pdf") or content_type == "application/pdf":
        with fitz.open(stream=content, filetype="pdf") as doc:
            return normalize_text("\n".join(page.get_text("text") for page in doc))
    if name.endswith(".docx") or (content_type or "").endswith("wordprocessingml.document"):
        return normalize_text(extract_docx_text(content))
    return content.decode("utf-8", errors="ignore")

def extract_personal_info_spacy(text: str) -> PersonalInfo:
    """Uses spaCy NER and standard regex for exact formats."""
    doc = nlp(text[:5000]) # Limit for performance
    
    email = re.search(r"[\w.\-+]+@[\w\-]+\.[\w.\-]+", text)
    phone = re.search(r"(?:(?:\+91|91)[-\s]?)?[6-9]\d{9}", text)
    linkedin = re.search(r"https?://(?:www\.)?linkedin\.com/[^\s)]+", text, re.I)
    github = re.search(r"https?://(?:www\.)?github\.com/[^\s)]+", text, re.I)
    
    name = None
    for ent in doc.ents:
        if ent.label_ == "PERSON" and not name:
            name = ent.text
            break
            
    return PersonalInfo(
        name=name,
        email=email.group(0) if email else None,
        phone=phone.group(0) if phone else None,
        linkedin=linkedin.group(0) if linkedin else None,
        github=github.group(0) if github else None,
        portfolio=None
    )

def extract_skills_nlp(text: str) -> list[str]:
    """Extracts skills using spaCy Noun Chunks and POS tagging, no hardcoded dictionaries."""
    doc = nlp(text.lower())
    skills = set()
    
    # 1. Extract Noun Chunks (e.g., "machine learning", "react js")
    for chunk in doc.noun_chunks:
        chunk_text = chunk.text.strip()
        # Filter out generic resume words and short meaningless chunks
        if len(chunk_text.split()) <= 4 and chunk_text not in STOP_NOUNS:
            if not any(stop in chunk_text for stop in ["job", "resume", "objective", "summary"]):
                skills.add(chunk_text)
                
    # 2. Extract Proper Nouns (PROPN) which often represent specific tech/frameworks
    for token in doc:
        if token.pos_ == "PROPN" and len(token.text) > 2 and not token.is_stop:
            skills.add(token.text)
            
    return list(skills)

def estimate_experience_spacy(text: str) -> float:
    """Uses spaCy DATE entities to calculate experience mathematically."""
    doc = nlp(text)
    years = set()
    for ent in doc.ents:
        if ent.label_ == "DATE":
            # Extract 4-digit years from date entities
            matches = re.findall(r"20\d{2}", ent.text)
            for m in matches:
                years.add(int(m))
                
    if len(years) >= 2:
        return float(max(years) - min(years))
    return 0.0

def parse_resume_text(
    text: str,
    resume_id: str | None = None,
    file_name: str | None = None,
    job_description: str | None = None,
    required_skills: list[str] | None = None,
) -> ResumeAnalysisResponse:
    text = normalize_text(text)
    
    # 1. Pure NLP Extraction
    personal = extract_personal_info_spacy(text)
    skills = extract_skills_nlp(text)
    experience_years = estimate_experience_spacy(text)
    
    # 2. Statistical Scoring (No hardcoded rules)
    skill_score = clamp(len(skills) * 4) 
    text_length_score = clamp(len(text) / 50)
    ats_score = clamp((skill_score * 0.6) + (text_length_score * 0.4))
    
    level = "senior" if experience_years >= 5 else "mid-level" if experience_years >= 2 else "fresher"

    return ResumeAnalysisResponse(
        resumeId=resume_id,
        fileName=file_name,
        personalInfo=personal,
        rawTextPreview=text[:900],
        skills=skills[:30],
        topSkills=skills[:10],
        missingCoreSections=[],
        education=[],
        workExperience=[],
        projects=[],
        certifications=[],
        experienceYears=experience_years,
        experienceLevel=level,
        industryTags=[],
        strengths=["Extracted via spaCy NLP"],
        weaknesses=[],
        recommendations=[],
        atsScore=ats_score,
        sectionScore=skill_score,
        skillScore=skill_score,
        readabilityScore=text_length_score,
        keywordScore=0,
        notes=["Generated by HireX Pure Statistical NLP Analyzer"],
    )