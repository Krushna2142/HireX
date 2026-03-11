import os

# ── AI Provider ─────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Database ────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")

# ── Auth ────────────────────────────────────────────────────
PYTHON_API_KEY = os.getenv("PYTHON_API_KEY", "change-me")

# ── Allowed origins ─────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://job-crawler-wine.vercel.app",
    "https://job-crawler-krushna2142s-projects.vercel.app",
    "https://job-crawler-git-main-krushna2142s-projects.vercel.app",
    "https://job-crawler-fcwr.onrender.com",
]