# python-service/app/ats/routes.py

from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ats.service import score_ats

router = APIRouter(prefix="/ats", tags=["ATS"])


class AtsCheckRequest(BaseModel):
    applicationId: str | None = None
    application_id: str | None = None

    candidate: Dict[str, Any] = Field(default_factory=dict)
    job: Dict[str, Any] = Field(default_factory=dict)
    resume: Dict[str, Any] = Field(default_factory=dict)

    # Legacy support from ts-api/src/ats/ats.service.ts
    resumeAnalysis: Dict[str, Any] = Field(default_factory=dict)
    jobTitle: str | None = None
    jobDescription: str | None = None
    requiredSkills: list[str] = Field(default_factory=list)

    scoringPolicy: Dict[str, Any] = Field(default_factory=dict)


@router.post("/check")
async def check_ats(payload: AtsCheckRequest) -> Dict[str, Any]:
    return score_ats(payload.model_dump())


@router.post("/score-against-job")
async def score_against_job(payload: AtsCheckRequest) -> Dict[str, Any]:
    return score_ats(payload.model_dump())