from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.live_interview.routes import router as live_interview_router
from app.mock_interview.routes import router as mock_interview_router
from app.resume.routes import router as resume_router

settings = get_settings()

app = FastAPI(
    title="JobCrawler Python AI Service",
    description="Custom AI/NLP service for resume analysis, ATS scoring, mock interview, and live interview assistant.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict:
    return {
        "service": settings.ai_service_name,
        "env": settings.ai_service_env,
        "status": "ok",
    }


@app.get("/health")
async def health() -> dict:
    return {
        "service": settings.ai_service_name,
        "status": "healthy",
        "version": "1.0.0",
    }


app.include_router(resume_router)
app.include_router(mock_interview_router)
app.include_router(live_interview_router)
