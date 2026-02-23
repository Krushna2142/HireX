import re

COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "react", "node.js",
    "aws", "docker", "kubernetes", "sql", "mongodb"
]

# Pre-compile regex patterns for better performance
SKILL_PATTERNS = {skill: re.compile(rf"\b{re.escape(skill)}\b") for skill in COMMON_SKILLS}

def score_resume(text: str) -> dict:
    text_lower = text.lower()
    
    matched_skills = [skill for skill in COMMON_SKILLS if SKILL_PATTERNS[skill].search(text_lower)]
    
    skill_score = min(len(matched_skills) * 10, 100)
    
    return {
        "overall_score": skill_score,
        "skills_detected": matched_skills,
        "suggestions": ["Add more quantifiable achievements"] if skill_score < 70 else []
    }
