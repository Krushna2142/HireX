from fastapi import APIRouter, Depends
from core.firebase import db
from utils.dependencies import get_current_user

router = APIRouter()

@router.get("/resumes")
async def get_resumes(user=Depends(get_current_user)):
    docs = (
        db.collection("resumes")
        .where("user_id", "==", user["uid"])
        .stream()
    )

    resumes = []
    for doc in docs:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        resumes.append(data)

    return {"resumes": resumes}