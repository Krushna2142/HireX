from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-KEY")

def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    import os
    expected_key = os.getenv("PYTHON_API_KEY")
    if not expected_key or api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key
