"""Liveness/readiness endpoint (no auth — reveals nothing sensitive)."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.ai import HealthResponse
from app.services.classification import classification_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    models = []
    if classification_service.trained:
        models.append("tfidf-nb")
    models.append("rules")
    if settings.cloud_enabled:
        models.append(settings.openai_model)
    return HealthResponse(
        status="ok",
        provider="openai" if settings.cloud_enabled else "demo",
        models=models,
    )
