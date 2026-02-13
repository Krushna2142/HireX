from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import uuid
import json

from core.database import get_db_connection
from utils.dependencies import get_current_user
from services.storage_service import save_resume_file
from services.resume_parser import parse_resume

router = APIRouter()


# ==========================================
# 1️⃣ Upload Resume
# ==========================================
@router.post("/analyze")
async def upload_resume(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    file_path, file_id = save_resume_file(file)
    text = parse_resume(file_path)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO resumes (id, user_id, file_name, file_path, content, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            file_id,
            user["uid"],
            file.filename,
            file_path,
            text[:3000],
            datetime.utcnow(),
        ),
    )

    conn.commit()
    conn.close()

    return {
        "message": "Resume uploaded successfully",
        "resume_id": file_id
    }


# ==========================================
# 2️⃣ Dashboard - Get User Resumes
# ==========================================
@router.get("/resumes")
async def get_resumes(user=Depends(get_current_user)):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, file_name, created_at
        FROM resumes
        WHERE user_id=%s
        ORDER BY created_at DESC
        """,
        (user["uid"],),
    )

    rows = cur.fetchall()
    conn.close()

    resumes = [
        {
            "id": r[0],
            "file_name": r[1],
            "created_at": r[2],
        }
        for r in rows
    ]

    return {"resumes": resumes}


# ==========================================
# 3️⃣ Analyze Existing Resume
# ==========================================
@router.post("/resumes/{resume_id}/analyze")
async def analyze_existing_resume(
    resume_id: str,
    user=Depends(get_current_user)
):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT content FROM resumes WHERE id=%s AND user_id=%s",
        (resume_id, user["uid"]),
    )

    row = cur.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Resume not found")

    content = row[0]

    # 🔥 Replace this with your AI model call
    analysis_result = {
        "summary": "AI analysis completed",
        "skills_detected": [],
        "strength_score": 75,
        "suggestions": ["Improve quantifiable achievements"]
    }

    cur.execute(
        "UPDATE resumes SET analysis=%s WHERE id=%s",
        (json.dumps(analysis_result), resume_id),
    )

    conn.commit()
    conn.close()

    return analysis_result
