from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.live_interview.assistant import assist_live_interview
from app.shared.schemas import LiveInterviewAssistantRequest, LiveInterviewAssistantResponse

router = APIRouter(prefix="/live-interview", tags=["live-interview"])


@router.post("/assistant", response_model=LiveInterviewAssistantResponse)
async def live_interview_assistant(
    payload: LiveInterviewAssistantRequest,
    _: None = Depends(verify_api_key),
) -> LiveInterviewAssistantResponse:
    result = assist_live_interview(
        transcript=payload.transcript,
        current_question=payload.currentQuestion,
        role=payload.role,
        skills=payload.skills,
    )

    return LiveInterviewAssistantResponse(**result)
