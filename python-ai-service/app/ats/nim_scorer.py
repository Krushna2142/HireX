# python-ai-service/app/ats/nim_scorer.py
import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

from app.ats.models import (
    AtsCheckRequest,
    AtsCheckResult,
    BatchAtsRequest,
    JobPayload,
    ResumePayload,
)

logger = logging.getLogger(__name__)

NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
VALID_RECS = {"STRONG_SHORTLIST", "SHORTLIST", "REVIEW", "WEAK_MATCH", "REJECT"}

SYSTEM_PROMPT = """You are an expert Applicant Tracking System (ATS) evaluator.
Evaluate the candidate resume against the job description.
Return ONLY valid JSON with this exact schema:
{
  "score": <integer 0-100>,
  "recommendation": "<STRONG_SHORTLIST|SHORTLIST|REVIEW|WEAK_MATCH|REJECT>",
  "matchedSkills": ["..."],
  "missingSkills": ["..."],
  "reason": "<1-2 sentence explanation>",
  "breakdown": {
    "requiredSkillMatch": <0-100>,
    "semanticMatch": <0-100>,
    "experienceRelevance": <0-100>
  }
}
Rules: score>=85 STRONG_SHORTLIST, >=70 SHORTLIST, >=55 REVIEW, >=40 WEAK_MATCH, else REJECT.
Judge semantic meaning, not exact keyword matches."""


def _client() -> AsyncOpenAI:
    key = os.getenv("NVIDIA_NIM_API_KEY") or os.getenv("NVIDIA_API_KEY") or ""
    if not key:
        raise RuntimeError("NVIDIA_NIM_API_KEY is not set in python-ai-service/.env")
    return AsyncOpenAI(base_url=NIM_BASE_URL, api_key=key)


def _model() -> str:
    return os.getenv("NIM_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")


def _rec_from_score(score: int) -> str:
    if score >= 85: return "STRONG_SHORTLIST"
    if score >= 70: return "SHORTLIST"
    if score >= 55: return "REVIEW"
    if score >= 40: return "WEAK_MATCH"
    return "REJECT"


def _parse_json(raw: str) -> Dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.I)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r"(\{[\s\S]*\})", cleaned)
        if m:
            return json.loads(m.group(1))
        raise ValueError(f"NIM returned non-JSON: {cleaned[:200]}")


def _normalize(data: Dict[str, Any], fallback_missing: List[str]) -> AtsCheckResult:
    score = max(0, min(100, int(data.get("score", 0) or 0)))
    rec = str(data.get("recommendation", "")).upper()
    if rec not in VALID_RECS:
        rec = _rec_from_score(score)
    return AtsCheckResult(
        score=score,
        recommendation=rec,
        matchedSkills=[str(s) for s in (data.get("matchedSkills") or [])][:20],
        missingSkills=[str(s) for s in (data.get("missingSkills") or fallback_missing)][:20],
        reason=str(data.get("reason", ""))[:1500] or f"NIM ATS score {score}%",
        breakdown=data.get("breakdown") or {},
    )


async def score_with_nvidia_nim(payload: AtsCheckRequest) -> AtsCheckResult:
    user_prompt = f"""JOB TITLE: {payload.job.title}
COMPANY: {payload.job.companyName or 'Unknown'}
REQUIRED SKILLS: {', '.join(payload.job.requiredSkills) or 'none'}
JOB DESCRIPTION:
{payload.job.description[:2000]}

CANDIDATE EXPERIENCE: {payload.candidate.experienceYears} years
CANDIDATE SKILLS: {', '.join(payload.resume.skills) or 'none'}
RESUME TEXT:
{payload.resume.text[:3000]}"""

    resp = await _client().chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=1024,
    )
    raw = resp.choices[0].message.content or ""
    return _normalize(_parse_json(raw), payload.job.requiredSkills)


async def score_batch_with_nim(payload: BatchAtsRequest) -> Optional[List[Dict[str, Any]]]:
    """Concurrent NIM scoring for SMALL batches. Returns None if any item fails
    so the router can fall back to the fast TF-IDF engine."""
    sem = asyncio.Semaphore(4)

    async def one(item):
        # ✅ FIXED: Direct instantiation, no shim functions needed
        req = AtsCheckRequest(
            applicationId=item.id,
            job=JobPayload(
                id="batch",
                title=(payload.jd_text or "").split("\n")[0][:120] or "Batch Job",
                description=payload.jd_text,
                requiredSkills=payload.required_skills,
            ),
            resume=ResumePayload(text=item.text, skills=item.skills),
        )
        async with sem:
            r = await score_with_nvidia_nim(req)
        return {"id": item.id, **r.model_dump()}

    try:
        return await asyncio.gather(*[one(i) for i in payload.resumes])
    except Exception as err:
        logger.warning(f"[NIM batch] failed, falling back to TF-IDF: {err}")
        return None