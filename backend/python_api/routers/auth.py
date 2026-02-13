from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from passlib.hash import bcrypt

from core.firebase import db
from utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class CredentialsCreate(BaseModel):
    username: str
    password: str
    role: str
    firebase_uid: Optional[str] = None

class CredentialsVerify(BaseModel):
    username: str
    password: str
    firebase_uid: Optional[str] = None

@router.post("/credentials/create")
async def create_credentials(
    payload: CredentialsCreate, current_user=Depends(get_current_user)
):
    firebase_uid = payload.firebase_uid or current_user.get("uid")
    if not firebase_uid:
        raise HTTPException(status_code=400, detail="Missing firebase_uid")

    users_ref = db.collection("users")
    existing = (
        users_ref.where("firebase_uid", "==", firebase_uid)
        .where("username", "==", payload.username)
        .get()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Credentials already exist")

    password_hash = bcrypt.hash(payload.password[:72])

    users_ref.add({
        "firebase_uid": firebase_uid,
        "username": payload.username,
        "password_hash": password_hash,
        "role": payload.role,
        "created_at": datetime.utcnow(),
    })

    return {"message": "Created"}

@router.post("/credentials/verify")
async def verify_credentials(
    payload: CredentialsVerify, current_user=Depends(get_current_user)
):
    firebase_uid = payload.firebase_uid or current_user.get("uid")
    if not firebase_uid:
        raise HTTPException(status_code=400, detail="Missing firebase_uid")

    users_ref = db.collection("users")
    docs = (
        users_ref.where("firebase_uid", "==", firebase_uid)
        .where("username", "==", payload.username)
        .get()
    )

    if not docs:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    for doc in docs:
        data = doc.to_dict() or {}
        stored_hash = data.get("password_hash")
        if stored_hash and bcrypt.verify(payload.password[:72], stored_hash):
            return {"message": "Verified"}

    raise HTTPException(status_code=401, detail="Invalid credentials")