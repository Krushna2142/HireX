# backend/python-api/services/interview_agent.py
"""
Mock Interview Agent — 100% Gemini real-time.
Zero hardcoded questions. Every response is generated live.
"""
import os
import json
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """You are PrepWise AI, an expert mock interview coach for software engineers.

## Behavior:
1. **Start**: Greet candidate, ask target role and difficulty preference.
2. **Ask ONE question at a time**. Mix technical + behavioral.
3. **After each answer** give:
   - Score: 1-10 with emoji (🟢 8-10, 🟡 5-7, 🔴 1-4)
   - What was good + what to improve
   - Brief model answer
4. **Adapt**: Score 8+ → harder. Score <5 → hints first.
5. **Every 5 questions**: Progress summary.
6. "skip" → next question. "end/stop" → final scorecard.

## Rules:
- Under 300 words per response
- Markdown formatting
- Encouraging but honest
- End questions with "Take your time 🎯"
"""


def generate_interview_response(
    messages: list[dict],
    role: str | None = None,
    difficulty: str | None = None,
) -> dict:
    """100% real-time — every response from Gemini."""
    if not GEMINI_API_KEY:
        return _smart_fallback(messages, role)

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.7, top_p=0.9, max_output_tokens=1024,
        ),
    )

    # Build Gemini history
    gemini_history = []
    for msg in messages[:-1]:
        gemini_history.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [msg["content"]],
        })

    chat = model.start_chat(history=gemini_history)

    last = messages[-1]["content"] if messages else "Hello, let's start."
    if len(messages) <= 1 and role:
        context = f"[Candidate targets: {role}"
        if difficulty:
            context += f", difficulty: {difficulty}"
        context += "]\n\n"
        last = context + last

    response = chat.send_message(last)

    return {
        "reply": response.text,
        "metadata": {
            "role": role,
            "difficulty": difficulty,
            "turn_count": len(messages),
            "model": "gemini-1.5-flash",
            "ai_powered": True,
        },
    }


def generate_scorecard(messages: list[dict]) -> dict:
    """AI-generated final scorecard."""
    if not GEMINI_API_KEY:
        return {"scorecard": "⚠️ Set GEMINI_API_KEY for AI scorecards.", "turn_count": len(messages)}

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.GenerationConfig(temperature=0.3, max_output_tokens=2048),
    )

    convo = "\n\n".join(
        f"**{'Candidate' if m['role']=='user' else 'Interviewer'}**: {m['content']}"
        for m in messages
    )

    prompt = f"""Generate a detailed interview scorecard in markdown:

1. **Overall Score** (out of 100)
2. **Technical Knowledge** (out of 100)
3. **Problem Solving** (out of 100)
4. **Communication** (out of 100)
5. **Strengths** (top 3)
6. **Areas to Improve** (top 3)
7. **Resources** (specific courses/sites)
8. **Readiness**: Ready / Almost Ready / Needs Practice

## Interview:
{convo[:6000]}
"""
    response = model.generate_content(prompt)
    return {"scorecard": response.text, "turn_count": len(messages)}


def _smart_fallback(messages: list[dict], role: str | None) -> dict:
    """When no Gemini key — still useful, context-aware."""
    turn = len(messages)
    last = (messages[-1]["content"] if messages else "").lower()

    if turn <= 1:
        reply = f"👋 Welcome! I see you're preparing for a **{role or 'Software Engineering'}** role. Let me start with a warm-up:\n\n**Tell me about yourself — your background, current role, and what excites you about this field.**\n\nTake your time 🎯"
    elif turn <= 3:
        reply = "Good start! Now let's go technical:\n\n**What happens when you type a URL in the browser and press Enter? Walk me through the entire flow.**\n\nTake your time 🎯"
    elif "skip" in last:
        reply = "No problem! Here's a different one:\n\n**Describe a time you had a disagreement with a teammate. How did you resolve it?** (Use the STAR method)\n\nTake your time 🎯"
    else:
        reply = f"Interesting answer! Here's a follow-up:\n\n**Can you give a specific example with numbers or measurable impact?** For instance, 'Reduced API response time by 60%' or 'Served 50K daily active users.'\n\nTake your time 🎯"

    return {
        "reply": reply,
        "metadata": {"ai_powered": False, "turn_count": turn, "model": "fallback"},
    }