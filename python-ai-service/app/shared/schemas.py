from typing import Any, Literal
from pydantic import BaseModel, Field


class PersonalInfo(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None


class ResumeProject(BaseModel):
    title: str
    description: str | None = None
    skills: list[str] = Field(default_factory=list)


class ResumeAnalysisResponse(BaseModel):
    resumeId: str | None = None
    fileName: str | None = None
    analyzer: str = "JobCrawler Custom Resume Analyzer"
    analyzerVersion: str = "1.0.0"
    status: Literal["COMPLETED", "FAILED"] = "COMPLETED"

    personalInfo: PersonalInfo = Field(default_factory=PersonalInfo)
    rawTextPreview: str = ""

    skills: list[str] = Field(default_factory=list)
    topSkills: list[str] = Field(default_factory=list)
    missingCoreSections: list[str] = Field(default_factory=list)

    education: list[str] = Field(default_factory=list)
    workExperience: list[str] = Field(default_factory=list)
    projects: list[ResumeProject] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)

    experienceYears: float = 0
    experienceLevel: str = "fresher"
    industryTags: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

    atsScore: int = 0
    sectionScore: int = 0
    skillScore: int = 0
    readabilityScore: int = 0
    keywordScore: int = 0

    notes: list[str] = Field(default_factory=list)


class AnalyzeResumeJsonRequest(BaseModel):
    resumeId: str | None = None
    fileName: str | None = None
    text: str
    jobTitle: str | None = None
    jobDescription: str | None = None
    requiredSkills: list[str] = Field(default_factory=list)


class JobScoreRequest(BaseModel):
    resumeAnalysis: dict[str, Any]
    jobTitle: str | None = None
    jobDescription: str | None = None
    requiredSkills: list[str] = Field(default_factory=list)


class JobScoreResponse(BaseModel):
    atsScore: int
    recommendation: Literal["SHORTLIST", "REVIEW", "REJECT"]
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    reason: str
    breakdown: dict[str, int] = Field(default_factory=dict)


class MockInterviewRequest(BaseModel):
    sessionId: str | None = None
    jobTitle: str
    candidateAnswer: str | None = None
    previousQuestion: str | None = None
    skills: list[str] = Field(default_factory=list)


class MockInterviewResponse(BaseModel):
    nextQuestion: str
    feedback: str
    score: int
    focusAreas: list[str] = Field(default_factory=list)


class LiveInterviewAssistantRequest(BaseModel):
    roomId: str
    transcript: str | None = None
    currentQuestion: str | None = None
    role: str | None = None
    skills: list[str] = Field(default_factory=list)


class LiveInterviewAssistantResponse(BaseModel):
    suggestedFollowUp: str
    summary: str
    suggestedScore: int
    concerns: list[str] = Field(default_factory=list)
    positives: list[str] = Field(default_factory=list)
