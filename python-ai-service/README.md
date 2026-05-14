# JobCrawler Python AI Service

A Dockerized FastAPI service for JobCrawler AI features.

Current v1:
- Resume file upload analysis without Gemini/OpenAI/Groq
- Rule-based resume parsing
- Skill extraction
- Experience estimation
- ATS scoring
- Job-resume matching
- Mock interview assistant placeholder
- Live interview assistant placeholder

NestJS should remain the main backend/orchestrator.
This service should only do AI/NLP work and return structured JSON.

## Run locally

```bash
cd python-ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

```txt
http://localhost:8000/health
http://localhost:8000/docs
```

## Run with Docker

```bash
docker build -t jobcrawler-python-ai-service .
docker run -p 8000:8000 --env-file .env jobcrawler-python-ai-service
```

## Main endpoints

```txt
GET  /health
POST /resume/analyze-file
POST /resume/analyze-json
POST /resume/score-against-job
POST /mock-interview/message
POST /live-interview/assistant
```

## Auth

Set `AI_SERVICE_API_KEY` in `.env`.

NestJS should send:

```txt
x-api-key: your-key
```

If `AI_SERVICE_API_KEY` is empty, auth is disabled for local development.
