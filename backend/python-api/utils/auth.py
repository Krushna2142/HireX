"""
Simple API-key guard. ts-api sends X-API-KEY on every request.
Python-api NEVER talks to users directly.
"""
import os
from fastapi import Header, HTTPException

API_KEY = os.getenv("PYTHON_API_KEY", "change-me-in-production")


async def verify_api_key(x_api_key: str = Header(..., alias="X-API-KEY")):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True