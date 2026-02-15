from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from services.ats_scorer import score_resume
from utils.auth import verify_api_key

router = APIRouter(prefix="/ai/ats", tags=["AI - ATS"])

class ATSRequest(BaseModel):
    resume_text: str

@router.post("/score")
async def ats_score(
    request: ATSRequest = Body(...),
    _: str = Depends(verify_api_key)
):
    score = score_resume(request.resume_text)
    return {"score": score, "message": "ATS scoring completed"}
