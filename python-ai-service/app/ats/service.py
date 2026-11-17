# python-ai-service/app/ats/service.py
from __future__ import annotations

import re
from typing import Any, Dict, List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.ats.jd_profile import deterministic_jd_profile, get_jd_profile_cached
from app.resume.skills import SKILL_ALIASES

STOP = {"the", "and", "for", "with", "our", "you", "at", "in", "of", "a", "an",
        "is", "to", "or", "on", "we", "us", "be", "as", "by", "job", "role"}


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").lower()).strip()


def clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, int(round(value))))


def _norm_skill(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").lower().replace("_", " ").strip())


def _has(hay: str, needle: str) -> bool:
    n = _norm_skill(needle)
    if not n or not hay:
        return False
    esc = re.escape(n)
    return re.search(rf"(^|[^a-z0-9+#]){esc}([^a-z0-9+#]|$)", hay) is not None


def _flat(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return " ".join(_flat(v) for v in value)
    if isinstance(value, dict):
        return " ".join(_flat(v) for v in value.values())
    return ""


_SKILL_HEADING = re.compile(
    r"\b(skills?|technical skills|technologies|tech stack|core competencies|tools)\b"
)
_EVIDENCE_HEADING = re.compile(
    r"\b(experience|work history|employment|projects?|education|certifications?|summary|achievements)\b"
)


def split_sections(text: str) -> Dict[str, str]:
    m = _SKILL_HEADING.search(text)
    if not m:
        return {"skills": "", "evidence": text, "all": text}
    start = m.start()
    rest = text[start + 6:]
    em = _EVIDENCE_HEADING.search(rest)
    end = start + 6 + em.start() if em else min(len(text), start + 800)
    return {
        "skills": text[start:end],
        "evidence": text[:start] + " " + text[end:],
        "all": text,
    }


def _tfidf_pct(a: str, b: str) -> int:
    if not a.strip() or not b.strip():
        return 0
    try:
        v = TfidfVectorizer(stop_words="english", max_features=5000)
        m = v.fit_transform([a, b])
        return clamp(float(cosine_similarity(m[0:1], m[1:2])[0][0]) * 100)
    except ValueError:
        return 0
    except Exception:
        return 0


def _recommend(score: int) -> str:
    if score >= 85:
        return "STRONG_SHORTLIST"
    if score >= 70:
        return "SHORTLIST"
    if score >= 55:
        return "REVIEW"
    if score >= 40:
        return "WEAK_MATCH"
    return "REJECT"


def _job_fields(payload: Dict[str, Any]):
    job = payload.get("job") or {}
    title = str(job.get("title") or payload.get("jobTitle") or "")
    desc = str(job.get("description") or payload.get("jobDescription") or "")
    skills = job.get("requiredSkills") or payload.get("requiredSkills") or payload.get("required_skills") or []
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",")]
    skills = [s for s in skills if isinstance(s, str) and s.strip()]
    exp_min = float(job.get("experienceMin") or payload.get("experienceMin") or 0)
    industry = str(job.get("industry") or "")
    return title, desc, skills, exp_min, industry


def _resume_fields(payload: Dict[str, Any]):
    resume = payload.get("resume") or {}
    ra = payload.get("resumeAnalysis") or {}
    text = str(
        resume.get("text") or resume.get("rawText") or resume.get("extractedText")
        or payload.get("resumeText") or ra.get("rawText") or ra.get("rawTextPreview") or ""
    )
    skills = resume.get("skills") or ra.get("topSkills") or ra.get("skills") or []
    if not isinstance(skills, list):
        skills = []
    projects = resume.get("projects") or ra.get("projects") or []
    experience = resume.get("experience") or ra.get("workExperience") or []
    exp_years = float((payload.get("candidate") or {}).get("experienceYears") or ra.get("experienceYears") or 0)
    return text, [str(s) for s in skills], projects, experience, exp_years


def _empty_result(reason: str) -> Dict[str, Any]:
    return {
        "score": 0, "atsScore": 0,
        "recommendation": "REJECT", "atsRecommendation": "REJECT",
        "matchedSkills": [], "matched_skills": [],
        "missingSkills": [], "missing_skills": [],
        "reason": reason,
        "breakdown": {
            "requiredSkillMatch": 0, "semanticMatch": 0, "projectRelevance": 0,
            "experienceRelevance": 0, "roleTitleRelevance": 0,
            "sectionCompleteness": 0, "keywordPlacement": 0,
            "formattingReadability": 0, "evidence": [], "warnings": [reason],
        },
    }


def _score_skills(skills: List[Dict[str, Any]], sections: Dict[str, str], resume_text: str):
    matched: List[str] = []
    missing: List[str] = []
    evidence: List[str] = []
    got = 0.0
    total = 0.0
    evidenced = 0
    
    # ✅ FIX: Strip stop phrases from skills so "basic understanding of authentication" becomes "authentication"
    stop_phrases = ["basic understanding of", "knowledge of", "experience with", "proficiency in", "ability to"]
    
    for sk in skills:
        weight = float(sk.get("weight", 3))
        total += weight
        
        # Clean the skill name
        clean_name = sk["name"].lower()
        for phrase in stop_phrases:
            clean_name = clean_name.replace(phrase, "").strip()
            
        terms = [clean_name] + list(sk.get("synonyms") or [])
        in_evidence = any(_has(sections["evidence"], t) for t in terms)
        in_skills = any(_has(sections["skills"], t) or _has(resume_text, t) for t in terms)
        
        if in_evidence:
            got += weight
            evidenced += 1
            matched.append(clean_name)
            evidence.append(f"Used in experience/projects: {clean_name}")
        elif in_skills:
            got += weight * 0.5
            matched.append(clean_name)
            evidence.append(f"Listed only (no usage evidence): {clean_name}")
        else:
            missing.append(clean_name)
            
    pct = clamp(100 * got / max(total, 1)) if total else 60
    ev_pct = clamp(100 * evidenced / max(len(skills), 1))
    return {"pct": pct, "evidencePct": ev_pct, "matched": matched, "missing": missing, "evidence": evidence}


def score_ats_with_profile(payload: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
    title, desc, required, exp_min, industry = _job_fields(payload)
    text, resume_skills, projects, experience, exp_years = _resume_fields(payload)
    integrity = payload.get("integrityReport") or {}

    jd_text = clean_text(f"{title} {desc} {' '.join(required)}")
    resume_text = clean_text(text)
    if not jd_text or not resume_text:
        return _empty_result("Missing JD or resume text.")

    sections = split_sections(resume_text)
    must = profile.get("mustHave") or deterministic_jd_profile(title, desc, required)["mustHave"]
    nice = profile.get("niceToHave") or []

    must_res = _score_skills(must, sections, resume_text)
    nice_res = _score_skills(nice, sections, resume_text) if nice else {"pct": 60, "evidencePct": 60, "matched": [], "missing": [], "evidence": []}

    semantic_pct = _tfidf_pct(jd_text, resume_text)

    proj_text = clean_text(" ".join(_flat(p) for p in projects) + " " + " ".join(_flat(e) for e in experience))
    if must_res["matched"]:
        project_pct = clamp(100 * sum(1 for s in must_res["matched"] if _has(proj_text, s)) / len(must_res["matched"]))
    else:
        project_pct = 25 if len(resume_text) > 400 else 0

    min_years = max(float(profile.get("minYears") or 0), exp_min)
    if min_years <= 0:
        experience_pct = 85 if exp_years > 0 else 65
    elif exp_years >= min_years:
        experience_pct = 90
    else:
        experience_pct = max(20, round(75 * exp_years / max(min_years, 1)))

    title_words = [w for w in re.findall(r"[a-z]+", title.lower()) if len(w) > 2 and w not in STOP]
    title_pct = clamp(100 * sum(1 for w in title_words if _has(resume_text, w)) / len(title_words)) if title_words else 60

    signals = [
        "summary" in resume_text,
        "skills" in resume_text or bool(resume_skills),
        bool(projects) or "project" in resume_text,
        bool(experience) or "experience" in resume_text,
        "education" in resume_text,
        len(resume_text) > 500,
    ]
    section_pct = clamp(100 * sum(signals) / len(signals))
    placement = clamp(65 + 8 * sum(1 for s in ["summary", "skills", "projects", "experience"] if s in resume_text))
    formatting = 90 if len(resume_text) > 1200 else 75 if len(resume_text) > 600 else 55 if len(resume_text) > 250 else 25

    hidden_ratio = float(integrity.get("hiddenRatio") or integrity.get("hidden_ratio") or 0)
    if hidden_ratio > 0.15:
        formatting = 30

    policy = payload.get("scoringPolicy") or {}

    def w(key: str, default: float) -> float:
        try:
            return float(policy.get(key, default)) / 100.0
        except Exception:
            return default / 100.0

    score = clamp(
        must_res["pct"] * w("requiredSkillMatch", 38)
        + nice_res["pct"] * w("semanticMatch", 18)
        + project_pct * w("projectRelevance", 15)
        + experience_pct * w("experienceRelevance", 10)
        + title_pct * w("roleTitleRelevance", 9)
        + section_pct * w("sectionCompleteness", 6)
        + placement * w("keywordPlacement", 2.5)
        + formatting * w("formattingReadability", 1.5)
    )

    warnings: List[str] = []
    if len(resume_text) < 150:
        score = min(score, 25)
        warnings.append("Very little readable resume text.")
    if must and not must_res["matched"]:
        score = min(score, 30)
        warnings.append("No required JD skills found in visible resume text.")

    flagged = bool(integrity.get("flagged"))
    severity = str(integrity.get("severity") or "none")
    if flagged:
        warnings.append(f"Integrity flags ({severity.upper()}) detected — recruiter review required; flags do not auto-reject.")
        for f in (integrity.get("findings") or [])[:5]:
            warnings.append(f"integrity: {f.get('type')} — {f.get('detail')}")

    recommendation = _recommend(score)
    if flagged and recommendation in ("STRONG_SHORTLIST", "SHORTLIST"):
        recommendation = "REVIEW"

    flag_tag = f"[FLAGGED:{severity.upper()}] " if flagged else ""
    reason = (
        f"{flag_tag}{recommendation}: {score}% for \"{title}\" "
        f"({profile.get('roleFamily', 'software')}, {profile.get('seniority', 'mid')}). "
        f"Required matched {len(must_res['matched'])}/{len(must)}; "
        f"evidenced in experience/projects {sum(1 for e in must_res['evidence'] if e.startswith('Used'))}/{len(must)}. "
        + (f"Missing: {', '.join(must_res['missing'][:6])}." if must_res["missing"] else "")
    )

    matched_all = must_res["matched"] + nice_res["matched"]
    missing_all = must_res["missing"] + nice_res["missing"]
    provider = profile.get("provider") or {}

    return {
        "score": score, "atsScore": score,
        "recommendation": recommendation, "atsRecommendation": recommendation,
        "matchedSkills": matched_all, "matched_skills": matched_all,
        "missingSkills": missing_all, "missing_skills": missing_all,
        "reason": reason,
        "breakdown": {
            "requiredSkillMatch": must_res["pct"],
            "semanticMatch": nice_res["pct"] if nice else semantic_pct,
            "projectRelevance": must_res["evidencePct"],
            "experienceRelevance": experience_pct,
            "roleTitleRelevance": title_pct,
            "sectionCompleteness": section_pct,
            "keywordPlacement": placement,
            "formattingReadability": formatting,
            "jdRoleFamily": profile.get("roleFamily", "software"),
            "jdSeniority": profile.get("seniority", "mid"),
            "jdMinYears": min_years,
            "jdProfileSource": profile.get("source", "deterministic"),
            "jdProfileModel": provider.get("model"),
            "requiredSkillsUsed": [m["name"] for m in must],
            "resumeSkillsDetected": (matched_all + [_norm_skill(s) for s in resume_skills])[:30],
            "resumeTextLength": len(resume_text),
            "evidence": (must_res["evidence"] + nice_res["evidence"])[:15],
            "warnings": warnings,
            "integrity": integrity or None,
        },
    }


def score_ats(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Sync entry (batch/legacy): deterministic JD profile."""
    title, desc, required, _, _ = _job_fields(payload)
    profile = deterministic_jd_profile(title, desc, required)
    profile["source"] = "deterministic"
    return score_ats_with_profile(payload, profile)


async def score_ats_async(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Primary entry: NIM (Nemotron 3 Ultra) JD profile, cached per JD."""
    title, desc, required, exp_min, _ = _job_fields(payload)
    profile = await get_jd_profile_cached(title, desc, required, exp_min)
    return score_ats_with_profile(payload, profile)


def batch_score_ats(jd_text: str, required_skills: List[str], resumes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    jd = clean_text(jd_text or "")
    if not jd.strip():
        return [{"id": r.get("id"), "score": 0, "recommendation": "REJECT",
                 "matchedSkills": [], "missingSkills": [], "reason": "Missing JD text"} for r in resumes]
    
    corpus = [jd] + [clean_text(f"{r.get('text', '')} {' '.join(r.get('skills') or [])}") for r in resumes]
    try:
        v = TfidfVectorizer(stop_words="english", max_features=5000)
        m = v.fit_transform(corpus)
        sims = cosine_similarity(m[0:1], m[1:]).flatten()
    except ValueError:
        sims = [0.0] * len(resumes)
    except Exception:
        sims = [0.0] * len(resumes)
        
    req = [_norm_skill(s) for s in (required_skills or []) if s and str(s).strip()]
    results: List[Dict[str, Any]] = []
    for i, r in enumerate(resumes):
        rtext = corpus[i + 1]
        matched = [s for s in req if any(_has(rtext, t) for t in ([s] + SKILL_ALIASES.get(s, [])))]
        missing = [s for s in req if s not in matched]
        skill_pct = clamp(100 * len(matched) / len(req)) if req else 60
        sem_pct = clamp(float(sims[i]) * 100)
        score = clamp(round(0.6 * sem_pct + 0.4 * skill_pct))
        rec = _recommend(score)
        results.append({
            "id": r.get("id"), "score": score, "atsScore": score,
            "recommendation": rec, "atsRecommendation": rec,
            "matchedSkills": matched, "matched_skills": matched,
            "missingSkills": missing, "missing_skills": missing,
            "reason": f"TF-IDF semantic {sem_pct}% | skill overlap {skill_pct}%",
            "breakdown": {"semanticMatch": sem_pct, "requiredSkillMatch": skill_pct},
        })
    return results