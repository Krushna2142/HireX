from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import analyze, resumes, auth, jobs

from core import firebase

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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
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