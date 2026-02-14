from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.init_db import init_db

from routers import analyze, resumes, auth, jobs


app = FastAPI()
init_db()
origins = [
    
    "https://job-crawler-wine.vercel.app",
    "https://job-crawler-krushna2142s-projects.vercel.app",
    "https://job-crawler-git-main-krushna2142s-projects.vercel.app",
    "https://job-crawler-n4spykvj6-krushna2142s-projects.vercel.app",
    "https://job-crawler-fcwr.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(analyze.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(jobs.router)      # /jobs, /alerts
app.include_router(auth.router)      # /auth/...

@app.options("/{path:path}", include_in_schema=False)
def options_handler():
    return {}

@app.get("/")
def root():
    return {"message": "JobCrawler Backend Running 🚀"}