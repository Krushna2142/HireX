from fastapi import Header, HTTPException
from firebase_admin import auth

async def get_current_user(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")