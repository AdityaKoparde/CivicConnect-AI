"""Shared fixtures: trained app + authenticated test client."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.classification import classification_service


@pytest.fixture(scope="session")
def client() -> TestClient:
    classification_service.train()
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def headers() -> dict[str, str]:
    return {"X-Service-Key": settings.service_key}


def turn(client: TestClient, headers: dict, message: str, state: dict | None = None,
         language: str | None = None) -> dict:
    body: dict = {"message": message, "state": state or {}}
    if language:
        body["language"] = language
    r = client.post("/api/v1/ai/chat", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()
