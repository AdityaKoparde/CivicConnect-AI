"""CivicConnect AI — FastAPI service entrypoint.

Python owns all AI/ML processing. The service exposes an internal,
key-protected REST API consumed by the Node.js backend.
"""
from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import ai, health
from app.core.config import settings
from app.services.classification import classification_service
from app.services.providers import gateway as gateway_provider
from app.services.translation import translation_service

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("civicconnect.ai")


def _error(status: int, code: str, message: str, details: list | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details or []}},
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title="CivicConnect AI Service",
        version="1.0.0",
        description=(
            "Internal multilingual grievance-understanding service: language "
            "detection, classification, entity extraction, translation, "
            "priority assessment, department recommendation and conversation AI."
        ),
        docs_url="/docs",
        redoc_url=None,
    )

    @app.on_event("startup")
    def _startup() -> None:  # pragma: no cover - exercised via lifespan in prod
        classification_service.train()
        # warm the reverse dictionaries used by the demo translator
        _ = translation_service._en_to_kn
        logger.info(
            "AI service ready | provider=%s | gateway=%s | key_auth=on | port=%d",
            "openai" if settings.cloud_enabled else "demo",
            "respan" if gateway_provider.enabled() else "off",
            settings.port,
        )

    @app.on_event("shutdown")
    def _shutdown() -> None:
        gateway_provider.shutdown()

    @app.middleware("http")
    async def _request_log(request: Request, call_next):
        rid = uuid.uuid4().hex[:12]
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        # Operational log only: no request bodies (citizen text is private).
        logger.info(
            "rid=%s %s %s -> %d (%.1fms)",
            rid, request.method, request.url.path, response.status_code, duration_ms,
        )
        response.headers["X-Request-Id"] = rid
        return response

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception(request: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            return _error(exc.status_code, str(detail["code"]), str(detail.get("message", "")))
        return _error(exc.status_code, "HTTP_ERROR", str(detail))

    @app.exception_handler(RequestValidationError)
    async def _validation_exception(request: Request, exc: RequestValidationError):
        details = [
            {"field": ".".join(str(p) for p in e.get("loc", [])), "message": e.get("msg", "")}
            for e in exc.errors()
        ]
        return _error(400, "VALIDATION_ERROR", "Request validation failed", details)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return _error(500, "INTERNAL_ERROR", "An unexpected error occurred")

    app.include_router(health.router)
    app.include_router(ai.router)
    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.port, reload=False)
