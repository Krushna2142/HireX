from fastapi import FastAPI, UploadFile, File, Form, Query
from pydantic import BaseModel
from app.services.llm import llm_chat
from app.services.analyze import analyze_pdf
from app.services.db import save_analysis, list_analyses

app = FastAPI(title="JobCrawler AI Service")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    sessionId: str
    messages: list[ChatMessage]

class TextPayload(BaseModel):
    resumeText: str
    userId: str | None = "guest"

@app.get("/health")
def health():
    return {"ok": True, "service": "python-aiml"}

@app.post("/llm/chat")
def chat(payload: ChatPayload):
    reply = llm_chat([m.model_dump() for m in payload.messages])
    return {"reply": reply}

@app.post("/analyze/resume")
async def analyze_resume(
    file: UploadFile = File(...),
    userId: str = Form(default="guest")
):
    if not file.filename.lower().endswith(".pdf"):
        return {"error": "Only PDF allowed"}
    content = await file.read()
    result = analyze_pdf(content, file.filename)
    try:
        save_analysis(userId, result)
    except Exception as e:
        print("[db] save error:", e)
    return result

@app.get("/analyze/history")
def analyze_history(
    userId: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500)
):
    try:
        items = list_analyses(userId, limit)
        return {"items": items}
    except Exception as e:
        print("[db] history error:", e)
        return {"items": []}