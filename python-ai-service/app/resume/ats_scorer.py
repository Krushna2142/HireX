from app.shared.schemas import JobScoreResponse
from app.shared.text_cleaner import clamp


def score_resume_against_job(
    resume_analysis: dict,
    job_title: str | None = None,
    job_description: str | None = None,
    required_skills: list[str] | None = None,
) -> JobScoreResponse:
    skills = resume_analysis.get("skills") or resume_analysis.get("topSkills") or []
    skills = [str(skill).lower().strip() for skill in skills if str(skill).strip()]

    required = [skill.lower().strip() for skill in (required_skills or []) if skill.strip()]

    if not required and job_description:
        lowered = job_description.lower()
        required = [skill for skill in skills if skill in lowered]

    matched = sorted(set(skills).intersection(required)) if required else skills[:8]
    missing = sorted(set(required) - set(skills)) if required else []

    skill_score = 70 if not required else clamp((len(matched) / max(1, len(required))) * 100)
    base_ats = int(resume_analysis.get("atsScore") or resume_analysis.get("ats_score") or 50)
    section_score = int(resume_analysis.get("sectionScore") or resume_analysis.get("section_score") or 50)

    title_score = 50
    if job_title:
        lowered_title = job_title.lower()
        if any(skill in lowered_title for skill in skills):
            title_score = 80

    final = clamp(base_ats * 0.35 + skill_score * 0.40 + section_score * 0.15 + title_score * 0.10)

    if final >= 75:
        recommendation = "SHORTLIST"
        reason = "Strong resume-to-job match based on skills, ATS structure, and section completeness."
    elif final >= 55:
        recommendation = "REVIEW"
        reason = "Moderate match. Recruiter should manually review project depth and missing skills."
    else:
        recommendation = "REJECT"
        reason = "Weak match against required skills and ATS criteria."

    return JobScoreResponse(
        atsScore=final,
        recommendation=recommendation,
        matchedSkills=matched,
        missingSkills=missing,
        reason=reason,
        breakdown={
            "baseAts": base_ats,
            "skillScore": skill_score,
            "sectionScore": section_score,
            "titleScore": title_score,
        },
    )
