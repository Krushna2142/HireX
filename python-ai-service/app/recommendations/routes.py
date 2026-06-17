# python-ai-service/app/recommendations/routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.recommendations.service import RecommendationEngine
from app.core.security import verify_api_key

# ✅ THIS IS THE KEY - Create the router instance
router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# Initialize the engine
engine = RecommendationEngine()

class MatchRequest(BaseModel):
    resume_text: str
    jobs: List[Dict[str, Any]]
    limit: Optional[int] = 20

class MatchResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    total: int

@router.post("/match", response_model=MatchResponse)
async def match_jobs(
    payload: MatchRequest,
    _: None = Depends(verify_api_key)
):
    """
    Uses Scikit-Learn TF-IDF to match resume text against job descriptions.
    Returns jobs sorted by match score (0-100).
    
    Requires x-api-key header for authentication.
    """
    try:
        matched = engine.match_resume_to_jobs(
            payload.resume_text,
            payload.jobs
        )
        
        # Apply limit if specified
        if payload.limit and payload.limit > 0:
            matched = matched[:payload.limit]
        
        return MatchResponse(
            recommendations=matched,
            total=len(matched)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation matching failed: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for recommendations service"""
    return {
        "service": "recommendations",
        "status": "healthy",
        "engine": "scikit-learn-tfidf"
    }