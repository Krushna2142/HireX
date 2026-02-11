from fastapi import APIRouter, UploadFile, File, Depends
from core.firebase import db
from utils.dependencies import get_current_user
from services.storage_service import save_resume_file
from services.resume_parser import parse_resume
from datetime import datetime

router = APIRouter()

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    # Save file
    file_path, file_id = save_resume_file(file)

    # Parse resume
    text = parse_resume(file_path)

    # Save to Firestore
    db.collection("resumes").document(file_id).set({
        "user_id": user["uid"],
        "file_name": file.filename,
        "file_path": file_path,
        "content": text[:1000],  # store preview
        "created_at": datetime.utcnow()
    })

    return {
        "message": "Resume uploaded successfully",
        "resume_id": file_id
    }
