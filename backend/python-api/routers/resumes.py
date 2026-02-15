from fastapi import APIRouter, UploadFile, File, Depends, Body
from services.resume_parser import parse_resume
from utils.auth import verify_api_key
import tempfile
import os

router = APIRouter(prefix="/ai/resume", tags=["AI - Resumes"])

@router.post("/parse")
async def parse_resume_endpoint(
    file: UploadFile = File(...),
    _: str = Depends(verify_api_key)
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    
    try:
        text = parse_resume(tmp_path)
        return {"text": text, "message": "Resume parsed successfully"}
    finally:
        os.unlink(tmp_path)

