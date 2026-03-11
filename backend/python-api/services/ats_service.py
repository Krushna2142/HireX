"""
ATS Scoring — Gemini AI for real-time analysis.
Falls back to smart local scoring if no API key.
ALL REAL-TIME — zero hardcoded scores.
"""
import os
import re
import json
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Comprehensive Skill Database ────────────────────────────
SKILLS_DB = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab",
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "firebase", "supabase",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
    "fastapi", "django", "flask", "express", "nest.js", "spring boot",
    "node.js", "react", "next.js", "angular", "vue.js", "svelte",
    "git", "linux", "ci/cd", "jenkins", "github actions", "gitlab ci",
    "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras",
    "opencv", "nltk", "spacy", "hugging face",
    "graphql", "rest api", "grpc", "microservices", "kafka", "rabbitmq",
    "html", "css", "tailwind", "sass", "bootstrap",
    "figma", "jira", "agile", "scrum",
]

ROLE_MAP = {
    "ML Engineer": {"python", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "keras"},
    "Data Scientist": {"python", "pandas", "numpy", "sql", "scikit-learn", "r", "tensorflow"},
    "Backend Engineer": {"python", "java", "go", "fastapi", "django", "flask", "sql", "docker", "postgresql"},
    "DevOps Engineer": {"docker", "kubernetes", "terraform", "aws", "azure", "gcp", "linux", "ci/cd", "ansible"},
    "Frontend Engineer": {"javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "vue.js"},
    "Full-Stack Engineer": {"javascript", "typescript", "react", "node.js", "sql", "docker", "python", "next.js"},
    "Mobile Developer": {"swift", "kotlin", "react", "flutter", "dart"},
    "Cloud Architect": {"aws", "azure", "gcp", "terraform", "kubernetes", "docker", "microservices"},
}

ATS_SECTIONS = {
    "contact_info": ["email", "phone", "linkedin", "github", "portfolio", "@"],
    "education": ["bachelor", "master", "b.tech", "m.tech", "b.e", "m.e", "phd", "university", "college", "degree", "gpa"],
    "experience": ["experience", "worked at", "developed", "built", "led", "managed", "implemented", "designed", "engineer at", "developer at"],
    "projects": ["project", "github.com", "deployed", "live at", "demo"],
    "certifications": ["certified", "certification", "aws certified", "google certified", "microsoft certified"],
    "achievements": ["award", "winner", "hackathon", "patent", "published", "speaker"],
}


def score_ats_local(resume_text: str, job_description: str = "") -> dict:
    """Real-time local ATS scoring — scans actual resume text dynamically."""
    normalized = resume_text.lower()
    jd_lower = job_description.lower() if job_description else ""
    word_count = len(resume_text.split())

    # 1) Real skill detection from resume
    matched_skills = list(set(
        s for s in SKILLS_DB if re.search(rf"\b{re.escape(s)}\b", normalized)
    ))

    # 2) Section detection
    section_scores = {}
    for section, keywords in ATS_SECTIONS.items():
        hits = sum(1 for k in keywords if k in normalized)
        section_scores[section] = min(100, int((hits / len(keywords)) * 100))

    # 3) Format quality checks
    format_checks = {
        "has_email": bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", normalized)),
        "has_phone": bool(re.search(r"[\+]?[\d\s\-()]{10,}", normalized)),
        "has_links": bool(re.search(r"(linkedin|github|portfolio|http)", normalized)),
        "good_length": 200 <= word_count <= 1200,
        "has_action_verbs": bool(re.search(r"\b(achieved|improved|reduced|increased|optimized|delivered|built|designed|led|managed)\b", normalized)),
        "has_metrics": bool(re.search(r"\d+[%x]|\$\d+|\d+\s*(users|customers|clients|team)", normalized)),
    }
    format_score = int((sum(format_checks.values()) / len(format_checks)) * 100)

    # 4) JD match
    jd_match = 0
    jd_matched_keywords = []
    jd_missing_keywords = []
    if jd_lower:
        jd_important = set(re.findall(r"\b[a-z][a-z+.#]{2,}\b", jd_lower))
        resume_words = set(re.findall(r"\b[a-z][a-z+.#]{2,}\b", normalized))
        jd_matched_keywords = sorted(list(jd_important & resume_words))[:30]
        jd_missing_keywords = sorted(list(jd_important - resume_words))[:15]
        jd_match = min(100, int((len(jd_matched_keywords) / max(len(jd_important), 1)) * 100))

    # 5) Role fit
    matched_set = set(matched_skills)
    role_fits = []
    for role, required in ROLE_MAP.items():
        overlap = required & matched_set
        if overlap:
            role_fits.append({
                "role": role,
                "match": int((len(overlap) / len(required)) * 100),
                "matched_skills": sorted(list(overlap)),
                "missing_skills": sorted(list(required - matched_set)),
            })
    role_fits.sort(key=lambda x: x["match"], reverse=True)

    # 6) Compute overall (weighted)
    skill_pts = min(100, len(matched_skills) * 3.5)
    section_avg = sum(section_scores.values()) / max(len(section_scores), 1)
    if jd_lower:
        overall = int(skill_pts * 0.25 + section_avg * 0.25 + format_score * 0.20 + jd_match * 0.30)
    else:
        overall = int(skill_pts * 0.35 + section_avg * 0.30 + format_score * 0.35)

    # 7) Dynamic suggestions based on REAL analysis
    suggestions = []
    if not format_checks["has_metrics"]:
        suggestions.append("Add quantifiable metrics (e.g., 'Reduced load time by 40%', 'Served 10K+ users')")
    if not format_checks["has_action_verbs"]:
        suggestions.append("Use strong action verbs: achieved, optimized, spearheaded, architected")
    if not format_checks["has_links"]:
        suggestions.append("Add LinkedIn and GitHub profile links")
    if section_scores.get("certifications", 0) == 0:
        suggestions.append("Add relevant certifications (AWS, Google Cloud, etc.)")
    if section_scores.get("projects", 0) < 20:
        suggestions.append("Add 2-3 projects with GitHub links and live demos")
    if not format_checks["good_length"]:
        if word_count < 200:
            suggestions.append("Resume is too short. Aim for 400-800 words with detailed experience")
        else:
            suggestions.append("Resume may be too long. Keep it concise — ideally 1-2 pages")
    if section_scores.get("achievements", 0) == 0:
        suggestions.append("Add achievements: hackathons, awards, publications")
    if len(matched_skills) < 6:
        suggestions.append("List more technical skills in a dedicated skills section")
    if jd_missing_keywords:
        suggestions.append(f"Add these keywords from the job description: {', '.join(jd_missing_keywords[:8])}")

    return {
        "overall_score": min(100, max(0, overall)),
        "format_score": format_score,
        "section_scores": section_scores,
        "skills_detected": sorted(matched_skills),
        "skills_count": len(matched_skills),
        "role_recommendations": role_fits[:4],
        "format_checks": format_checks,
        "word_count": word_count,
        "jd_match_score": jd_match,
        "jd_matched_keywords": jd_matched_keywords,
        "jd_missing_keywords": jd_missing_keywords,
        "suggestions": suggestions,
        "ai_powered": False,
    }


async def score_ats_ai(resume_text: str, job_description: str = "") -> dict:
    """Gemini-powered real-time ATS scoring. Zero static data."""
    if not GEMINI_API_KEY:
        return score_ats_local(resume_text, job_description)

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.GenerationConfig(temperature=0.2, max_output_tokens=2048),
    )

    jd_block = f"\n\n## Job Description:\n{job_description[:2000]}" if job_description else ""

    prompt = f"""You are an expert ATS (Applicant Tracking System) resume analyzer.

Analyze this resume THOROUGHLY and return a JSON object. Base ALL scores on the ACTUAL resume content — never make up data.

Return ONLY this JSON structure (no markdown fences):
{{
    "overall_score": <0-100>,
    "format_score": <0-100>,
    "content_score": <0-100>,
    "keywords_score": <0-100>,
    "skills_detected": ["skill1", "skill2", ...],
    "missing_skills": ["skill1", "skill2", ...],
    "role_recommendations": [
        {{"role": "Role Name", "match": <0-100>, "matched_skills": ["..."], "missing_skills": ["..."]}}
    ],
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2", "weakness3"],
    "suggestions": ["actionable suggestion 1", "actionable suggestion 2", ...],
    "summary": "2-3 sentence professional summary of the resume quality"
}}

## Resume (analyze this — real text, not a sample):
{resume_text[:5000]}{jd_block}

Return ONLY valid JSON.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if model adds them
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(text)

        # Enrich with local data
        local = score_ats_local(resume_text, job_description)
        result["section_scores"] = local["section_scores"]
        result["format_checks"] = local["format_checks"]
        result["word_count"] = local["word_count"]
        result["jd_match_score"] = local["jd_match_score"]
        result["jd_matched_keywords"] = local["jd_matched_keywords"]
        result["jd_missing_keywords"] = local["jd_missing_keywords"]
        result["ai_powered"] = True
        return result

    except Exception:
        fallback = score_ats_local(resume_text, job_description)
        fallback["ai_powered"] = False
        return fallback