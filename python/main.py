# main.py
# FastAPI entry point — resume analysis microservice.
#
# Responsibilities:
#   - Expose POST /analyse endpoint
#   - Health check at GET /health
#   - Load spaCy model on startup (not per-request)
#   - Structured error responses

import time
import logging
from contextlib import asynccontextmanager

import spacy
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import analyse
from app.services.extractor import ResumeExtractor

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("resume-api")

# ── App state — shared across requests ───────────────────────────────────────
# spaCy model is loaded ONCE on startup, not per-request.
# Loading takes ~2s — doing it per-request would make the API unusable.

class AppState:
    extractor: ResumeExtractor = None
    startup_time: float = None

app_state = AppState()

# ── Lifespan — replaces deprecated @app.on_event ─────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    logger.info("Loading spaCy model...")
    start = time.time()

    try:
        nlp = spacy.load("en_core_web_sm")
        app_state.extractor = ResumeExtractor(nlp)
        app_state.startup_time = time.time() - start
        logger.info(f"✅ spaCy model loaded in {app_state.startup_time:.2f}s")
    except OSError:
        logger.error(
            "❌ spaCy model 'en_core_web_sm' not found.\n"
            "   Run: python -m spacy download en_core_web_sm"
        )
        raise

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Shutting down resume analysis service")

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Resume Analysis API",
    description="spaCy-powered resume extraction service for JobCrawler",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow NestJS backend to call this service ─────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production to your NestJS domain
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Inject shared state into routers ─────────────────────────────────────────
# Passed via app.state so routers don't need global imports.

@app.middleware("http")
async def inject_state(request, call_next):
    request.state.extractor = app_state.extractor
    return await call_next(request)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(analyse.router, tags=["Analysis"])

# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status":       "ok",
        "model_loaded": app_state.extractor is not None,
        "startup_time": f"{app_state.startup_time:.2f}s" if app_state.startup_time else None,
        "version":      "1.0.0",
    }

# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )