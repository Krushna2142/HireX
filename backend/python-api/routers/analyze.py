#  backend/python-api/routers/analyze.py
"""
Resume Analysis Router.
Endpoints called ONLY by ts-api. Auth = X-API-KEY.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from utils.auth import verify_api_key
from services.resume_parser import parse_resume_from_bytes
from services.ats_service import score_ats_local, score_ats_ai

router = APIRouter(tags=["analyze"])


class AnalyzeTextRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = ""


@router.post("/analyze/upload")
async def analyze_upload(
    file: UploadFile = File(...),
    _=Depends(verify_api_key),
):
    """Upload resume file → parse → ATS score. Called by ts-api."""
    allowed = {"pdf", "docx"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in allowed:
        raise HTTPException(400, f"Only {allowed} files accepted")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file")

    text = parse_resume_from_bytes(contents, file.filename)
    if not text.strip():
        raise HTTPException(422, "Could not extract text from file")

    result = await score_ats_ai(text)
    result["resume_text"] = text
    return result


@router.post("/analyze/text")
async def analyze_text(body: AnalyzeTextRequest, _=Depends(verify_api_key)):
    """Analyze from plain text. For ATS checker re-scoring."""
    if not body.resume_text.strip():
        raise HTTPException(400, "resume_text is empty")
    return await score_ats_ai(body.resume_text, body.job_description)


@router.post("/analyze/ats-check")
async def ats_check(body: AnalyzeTextRequest, _=Depends(verify_api_key)):
    """Quick local ATS check — no AI, instant response."""
    if not body.resume_text.strip():
        raise HTTPException(400, "resume_text is empty")
    return score_ats_local(body.resume_text, body.job_description)