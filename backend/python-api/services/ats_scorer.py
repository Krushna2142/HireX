import re

COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "react", "node.js",
    "aws", "docker", "kubernetes", "sql", "mongodb"
]

def score_resume(text: str) -> dict:
    text_lower = text.lower()
    
    matched_skills = [skill for skill in COMMON_SKILLS if re.search(rf"\b{re.escape(skill)}\b", text_lower)]
    
    skill_score = min(len(matched_skills) * 10, 100)
    
    return {
        "overall_score": skill_score,
        "skills_detected": matched_skills,
        "suggestions": ["Add more quantifiable achievements"] if skill_score < 70 else []
    }
