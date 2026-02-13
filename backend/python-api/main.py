from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import analyze, resumes, auth

from core import firebase  # ensures firebase admin initializes

app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://job-crawler-wine.vercel.app",
    "https://job-crawler-krushna2142s-projects.vercel.app",
    "https://job-crawler-git-main-krushna2142s-projects.vercel.app",
    "https://job-crawler-7o0thjixu-krushna2142s-projects.vercel.app",
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
app.include_router(auth.router)  # /auth/...

@app.options("/{path:path}", include_in_schema=False)
def options_handler():
    return {}

@app.get("/")
def root():
    return {"message": "JobCrawler Backend Running 🚀"}