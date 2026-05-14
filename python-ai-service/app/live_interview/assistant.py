from app.shared.text_cleaner import clamp


def assist_live_interview(
    transcript: str | None,
    current_question: str | None,
    role: str | None,
    skills: list[str],
) -> dict:
    text = (transcript or "").strip()
    lowered = text.lower()

    positives: list[str] = []
    concerns: list[str] = []

    score = 50

    if len(text) > 150:
        score += 15
        positives.append("Candidate gave a reasonably detailed answer.")
    else:
        concerns.append("Answer is short. Ask for more depth and examples.")

    if any(word in lowered for word in ["because", "tradeoff", "scale", "architecture", "database"]):
        score += 15
        positives.append("Candidate is showing reasoning/architecture language.")

    if skills and any(skill.lower() in lowered for skill in skills):
        score += 15
        positives.append("Answer references relevant skills from the role.")
    elif skills:
        concerns.append("Answer does not clearly connect with required skills.")

    if any(word in lowered for word in ["not sure", "don't know", "confused"]):
        score -= 10
        concerns.append("Candidate showed uncertainty. Ask a simpler follow-up.")

    score = clamp(score)

    focus = skills[0] if skills else "the main concept"
    suggested = f"Can you go one level deeper and explain how you would implement {focus} in a real production system?"

    if current_question:
        suggested = f"Following your question '{current_question}', ask: what tradeoffs did you consider and how would you improve this solution?"

    summary = "Candidate response captured. Use the follow-up to test depth, clarity, and practical implementation."

    return {
        "suggestedFollowUp": suggested,
        "summary": summary,
        "suggestedScore": score,
        "concerns": concerns,
        "positives": positives,
    }
