# C:\Projects\Job-Crawler\backend\python-api\routers\auth.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import bcrypt

from core.database import get_db_connection
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
    payload: CredentialsCreate,
    current_user=Depends(get_current_user)
):
    firebase_uid = payload.firebase_uid or current_user.get("uid")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM users WHERE firebase_uid=%s AND username=%s",
        (firebase_uid, payload.username),
    )

    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="Credentials already exist")

    password_hash = bcrypt.hashpw(
        payload.password[:72].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    cur.execute(
        """
        INSERT INTO users (firebase_uid, username, password_hash, role)
        VALUES (%s, %s, %s, %s)
        """,
        (firebase_uid, payload.username, password_hash, payload.role),
    )

    conn.commit()
    conn.close()

    return {"message": "Created"}


@router.post("/credentials/verify")
async def verify_credentials(
    payload: CredentialsVerify,
    current_user=Depends(get_current_user)
):
    firebase_uid = payload.firebase_uid or current_user.get("uid")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT password_hash FROM users WHERE firebase_uid=%s AND username=%s",
        (firebase_uid, payload.username),
    )

    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    stored_hash = row[0]

    if bcrypt.checkpw(
        payload.password[:72].encode("utf-8"),
        stored_hash.encode("utf-8"),
    ):
        return {"message": "Verified"}

    raise HTTPException(status_code=401, detail="Invalid credentials")
