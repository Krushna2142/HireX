from fastapi import Header, HTTPException, status
from app.core.config import get_settings


async def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()

    # Local/dev mode: if no key configured, allow requests.
    if not settings.ai_service_api_key:
        return

    if x_api_key != settings.ai_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing AI service API key",
        )
