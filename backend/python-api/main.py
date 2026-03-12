# backend/python-api/main.py
"""
JobCrawler Python AI/ML Service.
NOT autonomous. Called ONLY by ts-api. No DB access. No user auth.
"""
import os
from dotenv import load_dotenv

load_dotenv()
from core.config import CORS_ORIGINS
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, interview

app = FastAPI(
    title="JobCrawler AI Service",
    description="AI/ML micro-service: resume analysis, ATS scoring, mock interviews",
    version="2.0.0",
)
origins = CORS_ORIGINS
origins = [
    "http://localhost:3001",
    "https://job-crawler-fcwr.onrender.com",
    "https://job-crawler-wine.vercel.app",
    "https://job-crawler-krushna2142s-projects.vercel.app",
    "https://job-crawler-git-main-krushna2142s-projects.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")   # /api/analyze/*
app.include_router(interview.router, prefix="/ai")  # /ai/interview/*


@app.get("/info")
def info():
    return {
        "service": "JobCrawler AI Service",
        "features": [
            "Resume parsing",
            "ATS scoring",
            "AI interview simulation"
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "python-ai",
        "gemini_enabled": bool(os.getenv("GEMINI_API_KEY"))
    }