from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import resumes, ats, interview

app = FastAPI(title="JobCrawler AI Service")

origins = [
    "https://job-crawler-wine.vercel.app",
    "https://job-crawler-krushna2142s-projects.vercel.app",
    "https://job-crawler-git-main-krushna2142s-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router)
app.include_router(ats.router)
app.include_router(interview.router)

@app.get("/")
def root():
    return {"message": "JobCrawler AI Service Running 🚀"}