# app/models/schemas.py
# Pydantic models — request/response contracts between NestJS and Python.
# These must match the TypeScript interfaces in NestJS exactly.

from typing import Optional
from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────

class AnalyseRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=50,
        description="Raw text extracted from the resume file",
    )


# ── Response sub-models ───────────────────────────────────────────────────────

class PersonalInfo(BaseModel):
    name:      Optional[str] = None
    email:     Optional[str] = None
    phone:     Optional[str] = None
    location:  Optional[str] = None
    linkedin:  Optional[str] = None
    github:    Optional[str] = None
    portfolio: Optional[str] = None


class WorkExperience(BaseModel):
    company:          str
    title:            str
    startDate:        Optional[str] = None   # "YYYY-MM" format
    endDate:          Optional[str] = None
    isCurrent:        bool = False
    responsibilities: list[str] = []
    achievements:     list[str] = []


class Education(BaseModel):
    institution:    str
    degree:         str
    field:          str
    graduationYear: Optional[int] = None
    gpa:            Optional[str] = None


class Skill(BaseModel):
    name:        str
    category:    str   # frontend | backend | devops | database | cloud | soft | other
    proficiency: int   # 1-5


class Certification(BaseModel):
    name:       str
    issuer:     str
    issueDate:  Optional[str] = None
    expiryDate: Optional[str] = None


class Project(BaseModel):
    title:       str
    description: str
    techStack:   list[str] = []
    repoUrl:     Optional[str] = None
    liveUrl:     Optional[str] = None


class Language(BaseModel):
    language:    str
    proficiency: str   # native | fluent | intermediate | basic


# ── Full analysis response ────────────────────────────────────────────────────

class AnalyseResponse(BaseModel):
    personalInfo:    PersonalInfo
    workExperience:  list[WorkExperience]  = []
    education:       list[Education]       = []
    skills:          list[Skill]           = []
    certifications:  list[Certification]   = []
    projects:        list[Project]         = []
    languages:       list[Language]        = []
    summary:         str                   = ""
    experienceYears: int                   = 0
    experienceLevel: str                   = "junior"  # junior|mid|senior|principal
    topSkills:       list[str]             = []
    industryTags:    list[str]             = []
    trajectory:      str                   = ""