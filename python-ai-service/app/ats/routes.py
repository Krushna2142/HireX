# python-ai-service/app/ats/routes.py
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import verify_api_key
from app.ats.service import batch_score_ats, score_ats_async
from app.core.nim_provider import NimProviderError, get_nim_provider

router = APIRouter(prefix="/ats", tags=["ATS"])


class BatchAtsRequest(BaseModel):
    jd_text: str
    required_skills: List[str]
    resumes: List[Dict[str, Any]]  # [{id, text, skills}]


class JdProfileRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    requiredSkills: Optional[List[str]] = []
    experienceMin: Optional[float] = 0


@router.post("/check")
async def check_ats(payload: Dict[str, Any] = Body(...), _: None = Depends(verify_api_key)):
    """Single-application ATS check (NestJS AtsPayload shape). NIM-backed JD profile."""
    return await score_ats_async(payload)


@router.post("/batch-check")
async def batch_check_ats(payload: BatchAtsRequest, _: None = Depends(verify_api_key)):
    results = batch_score_ats(payload.jd_text, payload.required_skills, payload.resumes)
    return {"results": results, "total": len(results)}


@router.get("/nim-health")
async def nim_health(_: None = Depends(verify_api_key)):
    """Model verification metadata — resolves the exact Nemotron id on this account."""
    provider = get_nim_provider()
    info = provider.health()
    
    # Force a resolution attempt if enabled but not yet resolved
    if provider.enabled and not info.get("resolved_model"):
        try:
            await provider.resolve_model()
            info = provider.health()
        except NimProviderError as err:
            info["error"] = str(err)
            
    return info