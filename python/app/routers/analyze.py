# app/routers/analyse.py
# POST /analyse — main endpoint called by NestJS ResumesService.

import logging
from fastapi import APIRouter, Request, HTTPException

from app.models.schemas import AnalyseRequest, AnalyseResponse

logger = logging.getLogger("resume-api.analyse")
router = APIRouter()


@router.post(
    "/analyse",
    response_model=AnalyseResponse,
    summary="Analyse resume text",
    description="Accepts raw resume text, returns structured extraction result.",
)
async def analyse_resume(
    body: AnalyseRequest,
    request: Request,
) -> AnalyseResponse:

    extractor = request.state.extractor

    if extractor is None:
        raise HTTPException(
            status_code=503,
            detail="NLP model not loaded — service is still starting up",
        )

    if not body.text or len(body.text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Resume text is too short. Minimum 50 characters required.",
        )

    logger.info(f"Analysing resume — {len(body.text)} chars")

    try:
        result = extractor.extract(body.text)
        logger.info(
            f"Extraction complete — "
            f"{len(result.skills)} skills, "
            f"{len(result.workExperience)} roles, "
            f"level: {result.experienceLevel}"
        )
        return result

    except Exception as exc:
        logger.error(f"Extraction failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Resume extraction failed: {str(exc)}",
        )