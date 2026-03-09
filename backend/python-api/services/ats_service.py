def analyze_resume(text: str):
    skills = ["python", "docker", "aws", "sql", "react"]
    detected = [s for s in skills if s in text.lower()]
    score = min(100, len(detected) * 20)
    return {
        "score": score,
        "skills": detected,
        "summary": "AI analysis complete"
    }