from app.shared.text_cleaner import clamp


def generate_mock_interview_reply(
    job_title: str,
    candidate_answer: str | None,
    previous_question: str | None,
    skills: list[str],
) -> dict:
    focus_skill = skills[0] if skills else "your strongest technical skill"

    if not previous_question:
        return {
            "nextQuestion": f"Tell me about yourself and explain why you are a good fit for the {job_title} role.",
            "feedback": "Start with your background, strongest skills, and one proof-based project.",
            "score": 50,
            "focusAreas": ["communication", "role clarity"],
        }

    answer = (candidate_answer or "").strip()
    score = 45

    if len(answer) > 120:
        score += 20
    if any(word in answer.lower() for word in ["project", "built", "implemented", "designed", "optimized"]):
        score += 15
    if any(skill.lower() in answer.lower() for skill in skills):
        score += 15

    score = clamp(score)

    if score >= 75:
        feedback = "Good answer. You gave useful detail and connected it with your skills."
    elif score >= 55:
        feedback = "Decent answer, but add measurable impact and a clearer project example."
    else:
        feedback = "Answer is too generic. Use project context, action, result, and tech stack."

    return {
        "nextQuestion": f"Can you explain one project where you used {focus_skill}, including the problem, architecture, and result?",
        "feedback": feedback,
        "score": score,
        "focusAreas": ["project depth", "technical clarity", "impact"],
    }
