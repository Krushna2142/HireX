"""
Mock Interview Router. Called by ts-api.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from utils.auth import verify_api_key
from services.interview_agent import generate_interview_response, generate_scorecard

router = APIRouter(tags=["interview"])


class ChatMessage(BaseModel):
    role: str
    content: str


class MockRequest(BaseModel):
    messages: list[ChatMessage]
    role: Optional[str] = None
    difficulty: Optional[str] = None


class ScorecardRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/interview/mock")
async def mock_interview(body: MockRequest, _=Depends(verify_api_key)):
    try:
        msgs = [{"role": m.role, "content": m.content} for m in body.messages]
        return generate_interview_response(msgs, body.role, body.difficulty)
    except Exception as e:
        raise HTTPException(500, f"Interview error: {str(e)}")


@router.post("/interview/scorecard")
async def scorecard(body: ScorecardRequest, _=Depends(verify_api_key)):
    try:
        msgs = [{"role": m.role, "content": m.content} for m in body.messages]
        return generate_scorecard(msgs)
    except Exception as e:
        raise HTTPException(500, f"Scorecard error: {str(e)}")