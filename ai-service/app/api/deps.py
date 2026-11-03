"""Shared FastAPI dependencies."""
from __future__ import annotations

import secrets

from fastapi import Header, HTTPException

from app.core.config import settings


async def require_service_key(
    x_service_key: str | None = Header(default=None),
) -> None:
    """Every internal AI endpoint is protected by the shared service key."""
    if not x_service_key or not secrets.compare_digest(
        x_service_key.encode(), settings.service_key.encode()
    ):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "UNAUTHENTICATED",
                "message": "invalid or missing X-Service-Key header",
            },
        )
