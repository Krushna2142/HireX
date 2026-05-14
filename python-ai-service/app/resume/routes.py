from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import get_settings
from app.core.security import verify_api_key
from app.resume.ats_scorer import score_resume_against_job
from app.resume.parser import extract_text_from_file, parse_resume_text
from app.shared.schemas import (
    AnalyzeResumeJsonRequest,
    JobScoreRequest,
    JobScoreResponse,
    ResumeAnalysisResponse,
)

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/analyze-file", response_model=ResumeAnalysisResponse)
async def analyze_resume_file(
    file: UploadFile = File(...),
    resumeId: str | None = Form(default=None),
    jobTitle: str | None = Form(default=None),
    jobDescription: str | None = Form(default=None),
    requiredSkills: str | None = Form(default=None),
    _: None = Depends(verify_api_key),
) -> ResumeAnalysisResponse:
    settings = get_settings()

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024

    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max allowed size is {settings.max_upload_mb} MB.",
        )

    skills = [
        item.strip()
        for item in (requiredSkills or "").split(",")
        if item.strip()
    ]

    text = extract_text_from_file(
        content=content,
        filename=file.filename or "resume",
        content_type=file.content_type,
    )

    if len(text.strip()) < 40:
        raise HTTPException(
            status_code=422,
            detail="Could not extract enough text from resume. Try a text-based PDF or DOCX.",
        )

    return parse_resume_text(
        text=text,
        resume_id=resumeId,
        file_name=file.filename,
        job_description=jobDescription,
        required_skills=skills,
    )


@router.post("/analyze-json", response_model=ResumeAnalysisResponse)
async def analyze_resume_json(
    payload: AnalyzeResumeJsonRequest,
    _: None = Depends(verify_api_key),
) -> ResumeAnalysisResponse:
    if len(payload.text.strip()) < 40:
        raise HTTPException(
            status_code=422,
            detail="Resume text is too short for analysis.",
        )

    return parse_resume_text(
        text=payload.text,
        resume_id=payload.resumeId,
        file_name=payload.fileName,
        job_description=payload.jobDescription,
        required_skills=payload.requiredSkills,
    )


@router.post("/score-against-job", response_model=JobScoreResponse)
async def score_against_job(
    payload: JobScoreRequest,
    _: None = Depends(verify_api_key),
) -> JobScoreResponse:
    return score_resume_against_job(
        resume_analysis=payload.resumeAnalysis,
        job_title=payload.jobTitle,
        job_description=payload.jobDescription,
        required_skills=payload.requiredSkills,
    )
