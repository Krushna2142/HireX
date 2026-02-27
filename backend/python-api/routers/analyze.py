from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from services.resume_parser import parse_resume
from services.ats_service import analyze_resume

router = APIRouter()

API_KEY = "your-secret-key"


@router.post("/analyze")
async def analyze(file: UploadFile = File(...), x_api_key: str = Header(None)):

    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    text = await parse_resume(file)
    result = analyze_resume(text)

    return result