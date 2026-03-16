# app/services/extractor.py
# Core NLP extraction logic using spaCy.
# Single responsibility: raw text → structured AnalyseResponse.

import re
import logging
from typing import Optional

import spacy
from spacy.language import Language

from app.models.schemas import (
    AnalyseResponse, PersonalInfo, WorkExperience,
    Education, Skill, Certification, Project, Language as LangModel,
)

logger = logging.getLogger("resume-api.extractor")

# ── Skill taxonomy ────────────────────────────────────────────────────────────
# Maps known skill keywords → category.
# Extend this dict to improve extraction coverage.

SKILL_TAXONOMY: dict[str, tuple[str, int]] = {
    # Frontend              (category, proficiency_hint)
    "javascript":    ("frontend",  3),
    "typescript":    ("frontend",  3),
    "react":         ("frontend",  3),
    "next.js":       ("frontend",  3),
    "vue":           ("frontend",  3),
    "angular":       ("frontend",  3),
    "html":          ("frontend",  2),
    "css":           ("frontend",  2),
    "tailwind":      ("frontend",  2),
    "sass":          ("frontend",  2),

    # Backend
    "node.js":       ("backend",   3),
    "python":        ("backend",   3),
    "java":          ("backend",   3),
    "go":            ("backend",   3),
    "rust":          ("backend",   3),
    "nestjs":        ("backend",   3),
    "express":       ("backend",   3),
    "fastapi":       ("backend",   3),
    "django":        ("backend",   3),
    "flask":         ("backend",   3),
    "spring":        ("backend",   3),
    "graphql":       ("backend",   3),
    "rest":          ("backend",   2),
    "grpc":          ("backend",   3),

    # Database
    "postgresql":    ("database",  3),
    "mysql":         ("database",  3),
    "mongodb":       ("database",  3),
    "redis":         ("database",  3),
    "elasticsearch": ("database",  4),
    "sql":           ("database",  2),
    "prisma":        ("database",  3),

    # DevOps
    "docker":        ("devops",    3),
    "kubernetes":    ("devops",    4),
    "terraform":     ("devops",    4),
    "ci/cd":         ("devops",    3),
    "jenkins":       ("devops",    3),
    "github actions":("devops",    3),
    "linux":         ("devops",    2),
    "git":           ("devops",    2),

    # Cloud
    "aws":           ("cloud",     4),
    "gcp":           ("cloud",     4),
    "azure":         ("cloud",     4),
    "supabase":      ("cloud",     2),
    "vercel":        ("cloud",     2),

    # Soft skills
    "leadership":    ("soft",      3),
    "communication": ("soft",      3),
    "teamwork":      ("soft",      2),
    "agile":         ("soft",      3),
    "scrum":         ("soft",      3),
}

# ── Regex patterns ────────────────────────────────────────────────────────────

EMAIL_RE    = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE    = re.compile(r"[\+\(]?[0-9][0-9\s\-\(\)]{7,}[0-9]")
LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w\-]+", re.IGNORECASE)
GITHUB_RE   = re.compile(r"github\.com/[\w\-]+", re.IGNORECASE)
URL_RE      = re.compile(r"https?://[^\s]+")
DATE_RE     = re.compile(
    r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\s+\d{4}|\d{4}",
    re.IGNORECASE,
)

# Section header patterns — used to split resume into sections
SECTION_RE = re.compile(
    r"^(experience|work experience|employment|education|skills|"
    r"technical skills|projects|certifications|languages|summary|"
    r"objective|profile|achievements|publications)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# ── Extractor ─────────────────────────────────────────────────────────────────

class ResumeExtractor:
    """
    Stateless extractor — nlp model injected at construction time.
    Each extract() call is independent and thread-safe.
    """

    def __init__(self, nlp: Language):
        self.nlp = nlp

    def extract(self, raw_text: str) -> AnalyseResponse:
        """
        Main entry point. Orchestrates all extraction stages.
        Returns a fully populated AnalyseResponse.
        """
        # Normalise whitespace — spaCy performs better on clean text
        text = self._normalise(raw_text)
        doc  = self.nlp(text)

        personal_info   = self._extract_personal_info(text, doc)
        skills          = self._extract_skills(text)
        work_experience = self._extract_work_experience(text)
        education       = self._extract_education(text, doc)
        projects        = self._extract_projects(text)
        certifications  = self._extract_certifications(text)
        languages       = self._extract_languages(text)
        summary         = self._extract_summary(text)

        experience_years = self._calculate_experience_years(work_experience)
        experience_level = self._classify_level(experience_years)
        top_skills       = [s.name for s in skills[:10]]
        industry_tags    = self._extract_industry_tags(text, skills)
        trajectory       = self._build_trajectory(work_experience)

        return AnalyseResponse(
            personalInfo    = personal_info,
            workExperience  = work_experience,
            education       = education,
            skills          = skills,
            certifications  = certifications,
            projects        = projects,
            languages       = languages,
            summary         = summary,
            experienceYears = experience_years,
            experienceLevel = experience_level,
            topSkills       = top_skills,
            industryTags    = industry_tags,
            trajectory      = trajectory,
        )

    # ── Personal info ─────────────────────────────────────────────────────────

    def _extract_personal_info(self, text: str, doc) -> PersonalInfo:
        email    = self._find(EMAIL_RE,    text)
        phone    = self._find(PHONE_RE,    text)
        linkedin = self._find(LINKEDIN_RE, text)
        github   = self._find(GITHUB_RE,   text)

        # Portfolio — any https URL that isn't LinkedIn or GitHub
        portfolio = None
        for match in URL_RE.finditer(text):
            url = match.group(0)
            if "linkedin" not in url and "github" not in url:
                portfolio = url
                break

        # Name — first PERSON entity spaCy finds, or first non-blank line
        name = None
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                name = ent.text.strip()
                break
        if not name:
            for line in text.split("\n"):
                stripped = line.strip()
                if stripped and len(stripped.split()) <= 5:
                    name = stripped
                    break

        # Location — first GPE (geo-political entity) spaCy finds
        location = None
        for ent in doc.ents:
            if ent.label_ == "GPE":
                location = ent.text.strip()
                break

        return PersonalInfo(
            name      = name,
            email     = email,
            phone     = phone,
            location  = location,
            linkedin  = f"https://{linkedin}" if linkedin else None,
            github    = f"https://{github}"   if github   else None,
            portfolio = portfolio,
        )

    # ── Skills ────────────────────────────────────────────────────────────────

    def _extract_skills(self, text: str) -> list[Skill]:
        text_lower = text.lower()
        found: list[Skill] = []
        seen: set[str] = set()

        for keyword, (category, proficiency) in SKILL_TAXONOMY.items():
            if keyword in text_lower and keyword not in seen:
                seen.add(keyword)
                found.append(Skill(
                    name        = keyword,
                    category    = category,
                    proficiency = proficiency,
                ))

        # Sort: higher proficiency first, then alphabetical
        found.sort(key=lambda s: (-s.proficiency, s.name))
        return found

    # ── Work experience ───────────────────────────────────────────────────────

    def _extract_work_experience(self, text: str) -> list[WorkExperience]:
        """
        Heuristic extraction — identifies experience blocks by looking for
        lines that contain a year (likely start/end dates).
        """
        section   = self._extract_section(text, ["experience", "work experience", "employment"])
        if not section:
            return []

        lines     = [l.strip() for l in section.split("\n") if l.strip()]
        entries: list[WorkExperience] = []
        current:  dict = {}

        for line in lines:
            # New job entry — line contains a year
            if re.search(r"\b(19|20)\d{2}\b", line):
                if current:
                    entries.append(self._build_work_entry(current))
                current = {"header": line, "bullets": []}
            elif current and (line.startswith("•") or line.startswith("-") or line.startswith("*")):
                current.setdefault("bullets", []).append(line.lstrip("•-* "))
            elif current:
                current.setdefault("extra", []).append(line)

        if current:
            entries.append(self._build_work_entry(current))

        return entries[:10]   # cap at 10 roles

    def _build_work_entry(self, raw: dict) -> WorkExperience:
        header  = raw.get("header", "")
        bullets = raw.get("bullets", [])
        parts   = header.split("|") if "|" in header else header.split(",")

        company = parts[0].strip() if len(parts) > 0 else "Unknown"
        title   = parts[1].strip() if len(parts) > 1 else "Unknown"

        dates      = DATE_RE.findall(header)
        start_date = dates[0] if len(dates) > 0 else None
        end_date   = dates[1] if len(dates) > 1 else None
        is_current = bool(
            re.search(r"present|current|now", header, re.IGNORECASE)
        )

        return WorkExperience(
            company          = company,
            title            = title,
            startDate        = start_date,
            endDate          = None if is_current else end_date,
            isCurrent        = is_current,
            responsibilities = bullets[:5],
            achievements     = [],
        )

    # ── Education ─────────────────────────────────────────────────────────────

    def _extract_education(self, text: str, doc) -> list[Education]:
        section = self._extract_section(text, ["education"])
        if not section:
            return []

        degree_re = re.compile(
            r"(b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|"
            r"bachelor|master|phd|doctorate|diploma|b\.?com|mba)",
            re.IGNORECASE,
        )

        entries: list[Education] = []
        lines   = [l.strip() for l in section.split("\n") if l.strip()]

        for line in lines:
            if degree_re.search(line):
                years = re.findall(r"\b(19|20)\d{2}\b", line)
                entries.append(Education(
                    institution    = "See resume",
                    degree         = degree_re.search(line).group(0).upper(),
                    field          = line,
                    graduationYear = int(years[-1]) if years else None,
                    gpa            = None,
                ))

        return entries[:5]

    # ── Projects ──────────────────────────────────────────────────────────────

    def _extract_projects(self, text: str) -> list[Project]:
        section = self._extract_section(text, ["projects"])
        if not section:
            return []

        lines   = [l.strip() for l in section.split("\n") if l.strip()]
        entries: list[Project] = []
        current: dict = {}

        for line in lines:
            if line and not line.startswith(("•", "-", "*")) and len(line) < 80:
                if current:
                    entries.append(self._build_project(current))
                current = {"title": line, "desc": []}
            elif current:
                current.setdefault("desc", []).append(line.lstrip("•-* "))

        if current:
            entries.append(self._build_project(current))

        return entries[:6]

    def _build_project(self, raw: dict) -> Project:
        desc      = " ".join(raw.get("desc", []))
        tech_keys = [k for k in SKILL_TAXONOMY if k in desc.lower()]
        repo      = self._find(re.compile(r"github\.com/[\w\-/]+", re.IGNORECASE), desc)

        return Project(
            title       = raw.get("title", "Untitled"),
            description = desc[:500],
            techStack   = tech_keys[:8],
            repoUrl     = f"https://{repo}" if repo else None,
            liveUrl     = None,
        )

    # ── Certifications ────────────────────────────────────────────────────────

    def _extract_certifications(self, text: str) -> list[Certification]:
        section = self._extract_section(text, ["certifications", "certificates"])
        if not section:
            return []

        lines   = [l.strip() for l in section.split("\n") if l.strip()]
        results: list[Certification] = []

        for line in lines:
            if len(line) > 5:
                years = re.findall(r"\b(19|20)\d{2}\b", line)
                results.append(Certification(
                    name      = line,
                    issuer    = "See resume",
                    issueDate = years[0] if years else None,
                ))

        return results[:10]

    # ── Languages ─────────────────────────────────────────────────────────────

    def _extract_languages(self, text: str) -> list[LangModel]:
        section = self._extract_section(text, ["languages"])
        if not section:
            return []

        known = {
            "english": "fluent", "hindi": "native", "french": "intermediate",
            "spanish": "intermediate", "german": "intermediate",
            "mandarin": "basic", "arabic": "basic", "japanese": "basic",
            "portuguese": "intermediate", "russian": "basic",
        }

        found: list[LangModel] = []
        text_lower = section.lower()

        for lang, default_proficiency in known.items():
            if lang in text_lower:
                # Try to find explicit proficiency near the language name
                proficiency = default_proficiency
                for level in ["native", "fluent", "intermediate", "basic"]:
                    pattern = re.compile(rf"{lang}.{{0,20}}{level}", re.IGNORECASE)
                    if pattern.search(section):
                        proficiency = level
                        break
                found.append(LangModel(language=lang.capitalize(), proficiency=proficiency))

        return found

    # ── Summary ───────────────────────────────────────────────────────────────

    def _extract_summary(self, text: str) -> str:
        section = self._extract_section(text, ["summary", "objective", "profile"])
        if section:
            # Take first 500 chars of the summary section
            return section.strip()[:500]

        # Fallback — first non-trivial paragraph
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 100]
        return paragraphs[0][:500] if paragraphs else ""

    # ── Calculations ──────────────────────────────────────────────────────────

    def _calculate_experience_years(self, work: list[WorkExperience]) -> int:
        if not work:
            return 0

        years_found: list[int] = []
        for entry in work:
            if entry.startDate:
                match = re.search(r"\b(20|19)\d{2}\b", entry.startDate)
                if match:
                    years_found.append(int(match.group(0)))

        if not years_found:
            return 0

        earliest = min(years_found)
        import datetime
        current_year = datetime.datetime.now().year
        return max(0, current_year - earliest)

    def _classify_level(self, years: int) -> str:
        if years >= 10: return "principal"
        if years >= 5:  return "senior"
        if years >= 2:  return "mid"
        return "junior"

    def _extract_industry_tags(self, text: str, skills: list[Skill]) -> list[str]:
        tags: set[str] = set()
        text_lower = text.lower()

        tag_keywords = {
            "fintech":      ["fintech", "banking", "payments", "finance"],
            "healthtech":   ["health", "medical", "hospital", "clinical"],
            "ecommerce":    ["ecommerce", "e-commerce", "retail", "shopify"],
            "saas":         ["saas", "b2b", "platform", "subscription"],
            "ai/ml":        ["machine learning", "deep learning", "nlp", "tensorflow", "pytorch"],
            "blockchain":   ["blockchain", "web3", "solidity", "ethereum"],
            "cybersecurity":["security", "penetration", "vulnerability", "soc"],
        }

        for tag, keywords in tag_keywords.items():
            if any(k in text_lower for k in keywords):
                tags.add(tag)

        # Add category-based tags from skills
        categories = {s.category for s in skills}
        if "frontend" in categories and "backend" in categories:
            tags.add("full-stack")
        if "devops" in categories or "cloud" in categories:
            tags.add("cloud-native")

        return sorted(tags)

    def _build_trajectory(self, work: list[WorkExperience]) -> str:
        if not work:
            return "No work history found"

        titles = [w.title for w in work if w.title and w.title != "Unknown"]
        if not titles:
            return "Career trajectory unclear from resume"

        if len(titles) == 1:
            return f"Currently working as {titles[0]}"

        return f"Progressed from {titles[-1]} to {titles[0]}"

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _normalise(self, text: str) -> str:
        # Collapse multiple blank lines, strip trailing whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()

    def _find(self, pattern: re.Pattern, text: str) -> Optional[str]:
        match = pattern.search(text)
        return match.group(0) if match else None

    def _extract_section(self, text: str, headers: list[str]) -> Optional[str]:
        """
        Finds a named section in the resume text and returns its content
        until the next section header begins.
        """
        pattern = re.compile(
            rf"({'|'.join(headers)})\s*:?\s*\n(.*?)(?=\n[A-Z][a-z].*:\s*\n|\Z)",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(text)
        return match.group(2).strip() if match else None