from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.ats.routes import router as ats_router
from app.resume.routes import router as resume_router
from app.mock_interview.routes import router as mock_interview_router
from app.live_interview.routes import router as live_interview_router
from app.recommendations.routes import router as recommendations_router

settings = get_settings()

app = FastAPI(
    title="JobCrawler Python AI Service",
    description="AI/NLP service: resume analysis, ATS scoring, integrity, interviews, recommendations.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": settings.ai_service_name,
        "env": settings.ai_service_env,
        "status": "ok",
        "routes": [
            "/health",
            "/ats/check",
            "/ats/batch-check",
            "/ats/integrity-scan",
            "/resume/analyze-file",
            "/resume/hidden-scan",
            "/resume/analyze-json",
            "/resume/score-against-job",
            "/mock-interview/message",
            "/live-interview/assistant",
            "/recommendations/match",
        ],
    }


@app.get("/health")
async def health():
    return {"service": settings.ai_service_name, "status": "healthy", "version": "2.0.0"}


app.include_router(ats_router)
app.include_router(resume_router)
app.include_router(mock_interview_router)
app.include_router(live_interview_router)
app.include_router(recommendations_router)