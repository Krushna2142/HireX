from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends
import uuid

from core.database import get_db_connection
from utils.dependencies import get_current_user
from services.storage_service import save_resume_file
from services.resume_parser import parse_resume

router = APIRouter()


@router.post("/analyze")
async def analyze_resume(
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
            text[:1000],
            datetime.utcnow(),
        ),
    )

    conn.commit()
    conn.close()

    return {
        "message": "Resume uploaded successfully",
        "resume_id": file_id
    }
