from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.mock_interview.assistant import generate_mock_interview_reply
from app.shared.schemas import MockInterviewRequest, MockInterviewResponse

router = APIRouter(prefix="/mock-interview", tags=["mock-interview"])


@router.post("/message", response_model=MockInterviewResponse)
async def mock_interview_message(
    payload: MockInterviewRequest,
    _: None = Depends(verify_api_key),
) -> MockInterviewResponse:
    result = generate_mock_interview_reply(
        job_title=payload.jobTitle,
        candidate_answer=payload.candidateAnswer,
        previous_question=payload.previousQuestion,
        skills=payload.skills,
    )

    return MockInterviewResponse(**result)
