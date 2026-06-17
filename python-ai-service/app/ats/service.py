# python-service/app/ats/service.py

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple


SKILL_SYNONYMS: Dict[str, List[str]] = {
    "python": ["python"],
    "machine learning": ["machine learning", "ml", "supervised learning", "classification", "regression"],
    "deep learning": ["deep learning", "neural network", "neural networks", "cnn", "rnn", "transformer"],
    "nlp": ["nlp", "natural language processing", "text classification", "entity extraction"],
    "rag": ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
    "llm": ["llm", "large language model", "large language models", "generative ai"],
    "vector database": ["vector database", "vector db", "vector search", "semantic search", "faiss", "pinecone", "chroma"],
    "embeddings": ["embedding", "embeddings", "sentence transformer", "semantic embedding"],
    "prompt engineering": ["prompt engineering", "prompting", "prompts"],
    "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "tensorflow": ["tensorflow", "tf"],
    "pytorch": ["pytorch", "torch"],
    "numpy": ["numpy"],
    "pandas": ["pandas"],
    "spacy": ["spacy"],
    "huggingface": ["huggingface", "hugging face", "transformers"],
    "opencv": ["opencv", "computer vision", "cv"],
    "fastapi": ["fastapi", "fast api"],
    "langchain": ["langchain"],
    "langgraph": ["langgraph"],
    "react": ["react", "react.js", "reactjs"],
    "next.js": ["next.js", "nextjs", "next js"],
    "node.js": ["node.js", "nodejs", "node js", "node"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js"],
    "html": ["html"],
    "css": ["css"],
    "tailwind": ["tailwind", "tailwind css"],
    "material ui": ["material ui", "mui", "material-ui"],
    "shadcn ui": ["shadcn ui", "shadcn", "shadcn/ui"],
    "framer motion": ["framer motion", "framer-motion"],
    "postgresql": ["postgresql", "postgres"],
    "mongodb": ["mongodb", "mongo db", "mongo"],
    "redis": ["redis"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes", "k8s"],
    "aws": ["aws", "amazon web services"],
    "java": ["java"],
    "spring boot": ["spring boot", "springboot"],
    "sql": ["sql", "mysql", "postgresql", "database query"],
    "data analysis": ["data analysis", "eda", "exploratory data analysis"],
    "statistics": ["statistics", "statistical analysis"],
    "etl": ["etl", "data pipeline", "data engineering"],
    "power bi": ["power bi", "powerbi"],
}

ROLE_KEYWORDS: Dict[str, List[str]] = {
    "ai": [
        "python",
        "machine learning",
        "deep learning",
        "nlp",
        "rag",
        "llm",
        "vector database",
        "embeddings",
        "prompt engineering",
        "scikit-learn",
        "tensorflow",
        "pytorch",
        "numpy",
        "pandas",
        "spacy",
    ],
    "fullstack": [
        "react",
        "next.js",
        "node.js",
        "typescript",
        "javascript",
        "api",
        "database",
        "postgresql",
        "mongodb",
    ],
    "frontend": [
        "react",
        "next.js",
        "typescript",
        "javascript",
        "html",
        "css",
        "tailwind",
        "material ui",
        "shadcn ui",
        "framer motion",
    ],
    "backend": [
        "node.js",
        "java",
        "spring boot",
        "fastapi",
        "api",
        "sql",
        "postgresql",
        "redis",
    ],
    "devops": [
        "docker",
        "kubernetes",
        "aws",
        "linux",
        "ci/cd",
        "monitoring",
    ],
    "data": [
        "python",
        "sql",
        "pandas",
        "numpy",
        "etl",
        "data analysis",
        "statistics",
        "power bi",
    ],
    "software": [
        "software",
        "api",
        "database",
        "testing",
        "git",
    ],
}


def normalize_text(value: Any) -> str:
    text = str(value or "").lower()
    text = text.replace("_", " ").replace("/", " ").replace("|", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_skill(value: Any) -> str:
    skill = normalize_text(value)

    aliases = {
        "sklearn": "scikit-learn",
        "scikit learn": "scikit-learn",
        "node": "node.js",
        "nodejs": "node.js",
        "node js": "node.js",
        "nextjs": "next.js",
        "next js": "next.js",
        "reactjs": "react",
        "mongo": "mongodb",
        "postgres": "postgresql",
        "tf": "tensorflow",
        "mui": "material ui",
        "shadcn": "shadcn ui",
    }

    return aliases.get(skill, skill)


def unique(items: List[str]) -> List[str]:
    seen = set()
    output: List[str] = []

    for item in items:
        clean = normalize_skill(item)
        if clean and clean not in seen:
            seen.add(clean)
            output.append(clean)

    return output


def flatten_text(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, (str, int, float, bool)):
        return str(value)

    if isinstance(value, list):
        return " ".join(flatten_text(item) for item in value)

    if isinstance(value, dict):
        return " ".join(flatten_text(v) for v in value.values())

    return str(value)


def to_string_list(value: Any) -> List[str]:
    if value is None:
        return []

    if isinstance(value, list):
        output: List[str] = []
        for item in value:
            output.extend(to_string_list(item))
        return output

    if isinstance(value, dict):
        for key in ["name", "skill", "title", "label", "value"]:
            if value.get(key):
                return [str(value[key])]
        return []

    if isinstance(value, str):
        if "," in value:
            return [x.strip() for x in value.split(",") if x.strip()]
        return [value.strip()] if value.strip() else []

    return [str(value)]


def keyword_exists(corpus: str, keyword: str) -> bool:
    corpus = normalize_text(corpus)
    keyword = normalize_skill(keyword)

    if not corpus or not keyword:
        return False

    if keyword in corpus:
        return True

    compact_corpus = re.sub(r"[^a-z0-9+#]", "", corpus)
    compact_keyword = re.sub(r"[^a-z0-9+#]", "", keyword)

    if len(compact_keyword) >= 3 and compact_keyword in compact_corpus:
        return True

    pattern = r"(^|[^a-z0-9+#])" + re.escape(keyword) + r"([^a-z0-9+#]|$)"
    return re.search(pattern, corpus) is not None


def skill_exists(skill: str, corpus: str, resume_skills: List[str]) -> bool:
    skill = normalize_skill(skill)
    synonyms = SKILL_SYNONYMS.get(skill, [skill])
    normalized_resume_skills = [normalize_skill(x) for x in resume_skills]

    for synonym in synonyms:
        synonym = normalize_skill(synonym)

        if synonym in normalized_resume_skills:
            return True

        if keyword_exists(corpus, synonym):
            return True

    return False


def extract_known_skills(text: str) -> List[str]:
    corpus = normalize_text(text)
    found: List[str] = []

    for skill, synonyms in SKILL_SYNONYMS.items():
        if any(keyword_exists(corpus, synonym) for synonym in synonyms):
            found.append(skill)

    return unique(found)


def detect_role_family(jd_text: str) -> str:
    text = normalize_text(jd_text)

    if re.search(
        r"\b(ai|artificial intelligence|machine learning|ml engineer|deep learning|nlp|llm|rag|vector database|embedding|tensorflow|pytorch|scikit)\b",
        text,
    ):
        return "ai"

    if re.search(r"\b(full stack|fullstack|mern|react.*node|node.*react)\b", text):
        return "fullstack"

    if re.search(r"\b(frontend|front end|react|next\.js|ui developer)\b", text):
        return "frontend"

    if re.search(r"\b(backend|back end|api|nestjs|spring boot|fastapi|django)\b", text):
        return "backend"

    if re.search(r"\b(devops|cloud|kubernetes|docker|aws|azure|ci/cd)\b", text):
        return "devops"

    if re.search(r"\b(data analyst|data engineer|etl|power bi|sql analyst)\b", text):
        return "data"

    return "software"


def calculate_experience_score(candidate_years: float, min_years: float) -> int:
    if min_years <= 0:
        return 80 if candidate_years > 0 else 65

    if candidate_years >= min_years:
        return 90

    return max(25, round((candidate_years / max(min_years, 1)) * 75))


def clamp_score(value: float) -> int:
    return max(0, min(100, round(value)))


def recommendation_from_score(score: int) -> str:
    if score >= 85:
        return "STRONG_SHORTLIST"
    if score >= 70:
        return "SHORTLIST"
    if score >= 55:
        return "REVIEW"
    if score >= 40:
        return "WEAK_MATCH"
    return "REJECT"


def legacy_recommendation(recommendation: str) -> str:
    if recommendation in ["STRONG_SHORTLIST", "SHORTLIST"]:
        return "SHORTLIST"

    if recommendation in ["REVIEW", "WEAK_MATCH"]:
        return "REVIEW"

    return "REJECT"


def extract_experience_years(payload: Dict[str, Any], resume_text: str) -> float:
    candidate = payload.get("candidate") or {}
    resume = payload.get("resume") or {}
    resume_analysis = payload.get("resumeAnalysis") or {}

    direct_values = [
        candidate.get("experienceYears"),
        candidate.get("experience_years"),
        resume.get("experienceYears"),
        resume.get("experience_years"),
        resume_analysis.get("experienceYears"),
        resume_analysis.get("experience_years"),
        resume_analysis.get("totalExperience"),
    ]

    for value in direct_values:
        try:
            num = float(value)
            if num > 0:
                return num
        except Exception:
            pass

    match = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s*(years|year|yrs|yr)", resume_text, re.I)
    if match:
        try:
            return float(match.group(1))
        except Exception:
            return 0

    return 0


def build_resume_corpus(payload: Dict[str, Any]) -> Tuple[str, List[str]]:
    candidate = payload.get("candidate") or {}
    resume = payload.get("resume") or {}
    resume_analysis = payload.get("resumeAnalysis") or {}

    raw_parts = [
        resume.get("text"),
        resume.get("rawText"),
        resume.get("extractedText"),
        resume_analysis.get("rawText"),
        resume_analysis.get("rawTextPreview"),
        flatten_text(resume.get("analysisJson")),
        flatten_text(resume_analysis),
        flatten_text(resume.get("projects")),
        flatten_text(resume.get("experience")),
        flatten_text(resume.get("education")),
        flatten_text(resume.get("certifications")),
        flatten_text(candidate),
    ]

    resume_text = normalize_text("\n".join(str(x or "") for x in raw_parts))

    explicit_skills = unique(
        to_string_list(resume.get("skills"))
        + to_string_list(resume.get("topSkills"))
        + to_string_list(candidate.get("profileSkills"))
        + to_string_list(candidate.get("topSkills"))
        + to_string_list(resume_analysis.get("skills"))
        + to_string_list(resume_analysis.get("topSkills"))
        + to_string_list(resume_analysis.get("technicalSkills"))
    )

    extracted_skills = extract_known_skills(resume_text)

    return resume_text, unique(explicit_skills + extracted_skills)


def build_jd_skills(payload: Dict[str, Any]) -> Tuple[str, List[str], str]:
    job = payload.get("job") or {}

    job_title = (
        job.get("title")
        or payload.get("jobTitle")
        or payload.get("job_title")
        or ""
    )

    job_description = (
        job.get("description")
        or payload.get("jobDescription")
        or payload.get("job_description")
        or ""
    )

    required_skills_raw = (
        job.get("requiredSkills")
        or job.get("required_skills")
        or job.get("skills")
        or payload.get("requiredSkills")
        or payload.get("required_skills")
        or []
    )

    jd_text = normalize_text(
        " ".join(
            [
                str(job_title),
                str(job_description),
                " ".join(to_string_list(required_skills_raw)),
            ]
        )
    )

    role_family = detect_role_family(jd_text)

    required_skills = unique(
        to_string_list(required_skills_raw)
        + extract_known_skills(jd_text)
        + ROLE_KEYWORDS.get(role_family, [])
    )

    return jd_text, required_skills, role_family


def score_ats(payload: Dict[str, Any]) -> Dict[str, Any]:
    job = payload.get("job") or {}

    jd_text, required_skills, role_family = build_jd_skills(payload)
    resume_text, resume_skills = build_resume_corpus(payload)

    matched_skills = [
        skill for skill in required_skills if skill_exists(skill, resume_text, resume_skills)
    ]

    missing_skills = [
        skill for skill in required_skills if skill not in matched_skills
    ]

    required_skill_pct = (
        round((len(matched_skills) / len(required_skills)) * 100)
        if required_skills
        else 0
    )

    role_keywords = ROLE_KEYWORDS.get(role_family, [])
    role_hits = [
        skill for skill in role_keywords if skill_exists(skill, resume_text, resume_skills)
    ]

    role_pct = round((len(role_hits) / len(role_keywords)) * 100) if role_keywords else 40

    project_text = normalize_text(
        flatten_text((payload.get("resume") or {}).get("projects"))
        + " "
        + flatten_text((payload.get("resumeAnalysis") or {}).get("projects"))
    )

    project_hits = [skill for skill in matched_skills if keyword_exists(project_text, skill)]

    if matched_skills:
        project_pct = round((len(project_hits) / len(matched_skills)) * 100)
    else:
        project_pct = 20 if len(project_text) > 200 else 0

    min_exp = 0
    try:
        min_exp = float(job.get("experienceMin") or job.get("experience_min") or 0)
    except Exception:
        min_exp = 0

    candidate_years = extract_experience_years(payload, resume_text)
    experience_pct = calculate_experience_score(candidate_years, min_exp)

    section_signals = [
        "summary" in resume_text,
        "skills" in resume_text or len(resume_skills) > 0,
        "project" in resume_text or len(project_text) > 50,
        "experience" in resume_text or candidate_years > 0,
        "education" in resume_text,
    ]

    section_pct = round((sum(1 for x in section_signals if x) / len(section_signals)) * 100)

    semantic_pct = round(required_skill_pct * 0.68 + role_pct * 0.32)

    keyword_placement_pct = 0
    if matched_skills:
        important_sections = ["summary", "skills", "projects", "experience"]
        keyword_placement_pct = min(
            100,
            55 + sum(1 for section in important_sections if section in resume_text) * 10,
        )

    if len(resume_text) > 1200:
        formatting_pct = 90
    elif len(resume_text) > 600:
        formatting_pct = 75
    elif len(resume_text) > 250:
        formatting_pct = 55
    else:
        formatting_pct = 25

    score = (
        required_skill_pct * 0.38
        + semantic_pct * 0.18
        + project_pct * 0.15
        + experience_pct * 0.10
        + role_pct * 0.09
        + section_pct * 0.06
        + keyword_placement_pct * 0.025
        + formatting_pct * 0.015
    )

    score = clamp_score(score)

    warnings: List[str] = []
    evidence: List[str] = []

    if len(resume_text) < 80:
        score = min(score, 25)
        warnings.append("Resume text is missing or too short. Resume parsing/extraction may have failed.")

    if required_skills and not matched_skills:
        score = min(score, 30)
        warnings.append("No JD required skills matched in resume.")

    if role_family == "ai":
        ai_core = [
            "python",
            "machine learning",
            "nlp",
            "rag",
            "llm",
            "vector database",
            "scikit-learn",
            "tensorflow",
            "pytorch",
            "numpy",
            "pandas",
        ]

        ai_hits = [skill for skill in ai_core if skill_exists(skill, resume_text, resume_skills)]

        if len(ai_hits) >= 7:
            score = max(score, 84)
        elif len(ai_hits) >= 5:
            score = max(score, 74)
        elif len(ai_hits) >= 3:
            score = max(score, 58)
        elif len(ai_hits) <= 1:
            score = min(score, 45)
            warnings.append("AI Engineer JD detected but AI/ML evidence is weak.")

    if role_family == "frontend":
        frontend_core = ["react", "next.js", "typescript", "javascript", "html", "css"]
        frontend_hits = [skill for skill in frontend_core if skill_exists(skill, resume_text, resume_skills)]

        if len(frontend_hits) >= 4:
            score = max(score, 72)
        elif len(frontend_hits) <= 1:
            score = min(score, 50)

    for skill in matched_skills[:12]:
        evidence.append(f"Matched JD skill: {skill}")

    recommendation = recommendation_from_score(score)
    old_recommendation = legacy_recommendation(recommendation)

    title = job.get("title") or payload.get("jobTitle") or "selected job"

    reason = (
        f'{recommendation}: {score}% match for "{title}". '
        f"Matched {len(matched_skills)}/{len(required_skills)} JD skills. "
        f"Missing: {', '.join(missing_skills[:8]) if missing_skills else 'none'}."
    )

    return {
        "score": score,
        "atsScore": score,
        "recommendation": old_recommendation,
        "atsRecommendation": recommendation,
        "matchedSkills": matched_skills,
        "matched_skills": matched_skills,
        "missingSkills": missing_skills,
        "missing_skills": missing_skills,
        "reason": reason,
        "breakdown": {
            "requiredSkillMatch": required_skill_pct,
            "semanticMatch": semantic_pct,
            "projectRelevance": project_pct,
            "experienceRelevance": experience_pct,
            "roleTitleRelevance": role_pct,
            "sectionCompleteness": section_pct,
            "keywordPlacement": keyword_placement_pct,
            "formattingReadability": formatting_pct,
            "jdRoleFamily": role_family,
            "requiredSkillsUsed": required_skills,
            "resumeSkillsDetected": resume_skills,
            "resumeTextLength": len(resume_text),
            "evidence": evidence,
            "warnings": warnings,
        },
    }