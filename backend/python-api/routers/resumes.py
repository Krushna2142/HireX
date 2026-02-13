from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from core.database import get_db_connection
from utils.dependencies import get_current_user
from services.storage_service import save_resume_file
from services.resume_parser import parse_resume
import uuid
import json
import re
from datetime import datetime

router = APIRouter(prefix="/resumes", tags=["resumes"])

COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "sql", "postgresql", "mysql", "mongodb", "redis",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "fastapi", "django", "flask", "node.js", "react", "next.js",
    "git", "linux", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch",
]

ROLE_RULES = [
    ("Machine Learning Engineer", {"python", "tensorflow", "pytorch", "scikit-learn"}),
    ("Data Scientist", {"python", "pandas", "numpy", "sql", "scikit-learn"}),
    ("Backend Engineer", {"python", "java", "go", "fastapi", "django", "flask", "sql"}),
    ("DevOps Engineer", {"docker", "kubernetes", "terraform", "aws", "azure", "gcp", "linux"}),
    ("Frontend Engineer", {"javascript", "typescript", "react", "next.js"}),
]


# 1️⃣ Upload Resume
@router.post("/upload")
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
            text,
            datetime.utcnow(),
        ),
    )

    conn.commit()
    conn.close()

    return {
        "message": "Resume uploaded",
        "resume_id": file_id
    }


# 2️⃣ Get All Resumes (Dashboard)
@router.get("")
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


# 3️⃣ Analyze Resume
@router.post("/{resume_id}/analyze")
async def analyze_resume(resume_id: str, user=Depends(get_current_user)):

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

    normalized = content.lower()
    matched_skills = [skill for skill in COMMON_SKILLS if re.search(rf"\b{re.escape(skill)}\b", normalized)]
    matched_set = set(matched_skills)

    role_scores = []
    for role, required_skills in ROLE_RULES:
        overlap = len(required_skills & matched_set)
        if overlap:
            role_scores.append((overlap, role))

    role_scores.sort(reverse=True)
    role_recommendations = [role for _, role in role_scores[:3]]

    summary = (
        f"Detected {len(matched_skills)} relevant skills from resume content. "
        f"Top recommendation: {role_recommendations[0]}."
        if role_recommendations
        else "Resume analyzed. Add more technical detail to improve role recommendations."
    )

    analysis_result = {
        "summary": summary,
        "skills": matched_skills,
        "roleRecommendations": role_recommendations,
    }

    cur.execute(
        "UPDATE resumes SET analysis=%s WHERE id=%s",
        (json.dumps(analysis_result), resume_id),
    )

    conn.commit()
    conn.close()

    return analysis_result
