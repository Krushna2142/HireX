# python-ai-service/app/ats/models.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CandidatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    name: str = ""
    email: str = ""
    profileSkills: List[str] = Field(default_factory=list)
    experienceYears: float = 0


class JobPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    title: str = ""
    description: str = ""
    requiredSkills: List[str] = Field(default_factory=list)
    experienceMin: float = 0
    companyName: Optional[str] = None


class ResumePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str = ""
    skills: List[str] = Field(default_factory=list)
    experience: List[Any] = Field(default_factory=list)
    projects: List[Any] = Field(default_factory=list)


class AtsCheckRequest(BaseModel):
    """Matches the NestJS AtsPayload shape sent by ats.service.ts."""
    model_config = ConfigDict(extra="ignore")
    applicationId: str = ""
    candidate: CandidatePayload = Field(default_factory=CandidatePayload)
    job: JobPayload = Field(default_factory=JobPayload)
    resume: ResumePayload = Field(default_factory=ResumePayload)
    scoringPolicy: Dict[str, float] = Field(default_factory=dict)


class AtsCheckResult(BaseModel):
    """Matches what NestJS normalizePythonResult() reads."""
    score: int = 0
    recommendation: str = "REVIEW"
    matchedSkills: List[str] = Field(default_factory=list)
    missingSkills: List[str] = Field(default_factory=list)
    reason: str = ""
    breakdown: Dict[str, Any] = Field(default_factory=dict)


class ResumeBatchItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    text: str = ""
    skills: List[str] = Field(default_factory=list)


class BatchAtsRequest(BaseModel):
    """Matches NestJS AtsProcessor.processBatchFromQueue() payload."""
    jd_text: str = ""
    required_skills: List[str] = Field(default_factory=list)
    resumes: List[ResumeBatchItem] = Field(default_factory=list)


class BatchAtsResponse(BaseModel):
    results: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0