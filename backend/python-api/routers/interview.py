from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from utils.auth import verify_api_key

router = APIRouter(prefix="/ai/interview", tags=["AI - Interview"])

class InterviewRequest(BaseModel):
    question: str
    answer: str

@router.post("/score")
async def score_interview(
    request: InterviewRequest = Body(...),
    _: str = Depends(verify_api_key)
):
    # Placeholder scoring logic
    score = 75
    feedback = "Good answer. Consider adding more specific examples."
    
    return {
        "score": score,
        "feedback": feedback
    }
