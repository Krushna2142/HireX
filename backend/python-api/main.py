from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze, resumes

app = FastAPI()

# CORS
origins = [
    "http://localhost:3000",
    "https://job-crawler-wine.vercel.app",
    "https://job-crawler-krushna2142s-projects.vercel.app",
    "https://job-crawler-git-main-krushna2142s-projects.vercel.app",
    "https://job-crawler-7o0thjixu-krushna2142s-projects.vercel.app"

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "JobCrawler Backend Running 🚀"}
