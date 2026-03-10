# C:\Projects\Job-Crawler\backend\python-api\routers\auth.py
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import bcrypt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.database import get_db_connection

router = APIRouter(prefix="/auth", tags=["auth"])


class CredentialsCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: Optional[str] = "candidate"


class CredentialsVerify(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _send_reset_email(to_email: str, reset_token: str) -> None:
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    html_body = f"""
    <html>
      <body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
        <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:12px;padding:40px;border:1px solid rgba(255,255,255,0.1);">
          <h1 style="color:#a78bfa;font-size:24px;margin-bottom:16px;">Password Reset Request</h1>
          <p style="color:#94a3b8;line-height:1.6;">
            We received a request to reset your Job Crawler account password.
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="{reset_link}"
             style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
            Reset Password
          </a>
          <p style="color:#94a3b8;">If you did not request this, you can safely ignore this email.</p>
          <p style="font-size:12px;color:#64748b;margin-top:24px;">
            If the button does not work, copy and paste this link:<br/>{reset_link}
          </p>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your Job Crawler password"
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())


@router.post("/register")
async def register(payload: CredentialsCreate):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email=%s", (payload.email,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")

    password_hash = bcrypt.hashpw(
        payload.password[:72].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    cur.execute(
        """
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES (%s, %s, %s, %s)
        """,
        (payload.full_name, payload.email, password_hash, payload.role),
    )

    conn.commit()
    conn.close()

    return {"message": "Account created successfully"}


@router.post("/login")
async def login(payload: CredentialsVerify):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, full_name, email, role, password_hash FROM users WHERE email=%s",
        (payload.email,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, full_name, email, role, stored_hash = row

    if not bcrypt.checkpw(
        payload.password[:72].encode("utf-8"),
        stored_hash.encode("utf-8"),
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "message": "Login successful",
        "user": {"id": user_id, "full_name": full_name, "email": email, "role": role},
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, email FROM users WHERE email=%s",
        (payload.email,),
    )
    row = cur.fetchone()

    if row:
        user_id, email = row
        reset_token = secrets.token_hex(32)
        expiry = datetime.now(timezone.utc) + timedelta(hours=1)

        cur.execute(
            "UPDATE users SET reset_token=%s, reset_token_expiry=%s WHERE id=%s",
            (reset_token, expiry, user_id),
        )
        conn.commit()

        try:
            _send_reset_email(email, reset_token)
        except Exception:
            pass

    conn.close()

    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    now = datetime.now(timezone.utc)
    cur.execute(
        "SELECT id, reset_token_expiry FROM users WHERE reset_token=%s",
        (payload.token,),
    )
    row = cur.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_id, expiry = row

    if expiry is None or expiry < now:
        conn.close()
        raise HTTPException(status_code=400, detail="Reset token has expired")

    password_hash = bcrypt.hashpw(
        payload.new_password[:72].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    cur.execute(
        """
        UPDATE users
        SET password_hash=%s, reset_token=NULL, reset_token_expiry=NULL
        WHERE id=%s
        """,
        (password_hash, user_id),
    )
    conn.commit()
    conn.close()

    return {"message": "Password updated successfully"}

