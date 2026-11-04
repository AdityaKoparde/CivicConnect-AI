"""API surface: auth, validation envelopes, translation, provider fallback."""
from __future__ import annotations

import pytest

from app.core.config import settings
from app.services.providers.openai_compat import LLMUnavailable, _parse_json_object


# ----------------------------------------------------------------- auth ------
def test_health_no_auth_needed(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["provider"] in ("demo", "openai")
    assert "tfidf-nb" in body["models"]


def test_ai_endpoints_require_service_key(client):
    r = client.post("/api/v1/ai/detect-language", json={"text": "hello"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_wrong_service_key_rejected(client):
    r = client.post(
        "/api/v1/ai/detect-language",
        json={"text": "hello"},
        headers={"X-Service-Key": "wrong-key"},
    )
    assert r.status_code == 401


# ---------------------------------------------------------- validation -------
def test_validation_error_envelope(client, headers):
    r = client.post("/api/v1/ai/detect-language", json={}, headers=headers)
    assert r.status_code == 400
    body = r.json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    assert body["details"]


def test_text_length_limit(client, headers):
    r = client.post(
        "/api/v1/ai/detect-language", json={"text": "x" * 5000}, headers=headers
    )
    assert r.status_code == 400


# ------------------------------------------------------------- endpoints -----
def test_classify_returns_valid_understanding(client, headers):
    r = client.post(
        "/api/v1/ai/classify-complaint",
        json={"text": "The drainage water is overflowing onto the road in Hubballi."},
        headers=headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["category"] == "drainage_sewage"
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["ai_provider"] == "demo"  # honest: demo results say demo
    assert body["requires_manual_review"] == (body["confidence"] < 0.65 or body["category"] == "other")


def test_extract_entities_endpoint(client, headers):
    r = client.post(
        "/api/v1/ai/extract-entities",
        json={"text": "No water near the bus stand in Mangaluru for 2 days."},
        headers=headers,
    )
    assert r.status_code == 200
    e = r.json()["entities"]
    assert e["district"] == "Dakshina Kannada" or e["city"] == "Mangaluru"
    assert e["duration_days"] == 2


def test_assess_priority_endpoint(client, headers):
    r = client.post(
        "/api/v1/ai/assess-priority",
        json={"text": "There is an exposed live wire sparking near the school gate."},
        headers=headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["priority"] in ("high", "critical")
    assert body["factors"]


def test_recommend_department_endpoint(client, headers):
    r = client.post(
        "/api/v1/ai/recommend-department",
        json={"category": "environmental_pollution", "district": "Mysuru"},
        headers=headers,
    )
    assert r.status_code == 200
    assert "Pollution" in r.json()["recommended_department"]


def test_translate_identity(client, headers):
    r = client.post(
        "/api/v1/ai/translate",
        json={"text": "hello", "target_language": "en", "source_language": "en"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["provider"] == "identity"


def test_translate_demo_phrase_table(client, headers):
    r = client.post(
        "/api/v1/ai/translate",
        json={"text": "There is no water supply in our area.", "target_language": "kn"},
        headers=headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "demo_phrase_table"
    assert body["original_text"] == "There is no water supply in our area."
    assert "ನೀರಿನ" in body["translated_text"] or "ಸರಬರಾಜು" in body["translated_text"]


# ------------------------------------------------------- provider behaviour ---
def test_parse_json_object_tolerates_code_fences():
    assert _parse_json_object('```json\n{"a": 1}\n```') == {"a": 1}
    assert _parse_json_object('here you go: {"a": 2} done') == {"a": 2}
    with pytest.raises(LLMUnavailable):
        _parse_json_object("not json at all")


def test_cloud_unavailable_falls_back_to_demo(client, headers, monkeypatch):
    """Missing/unreachable cloud provider → demo engine, flagged as demo."""
    monkeypatch.setattr(settings, "provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test-not-real")
    monkeypatch.setattr(settings, "openai_base_url", "http://127.0.0.1:9")
    r = client.post(
        "/api/v1/ai/classify-complaint",
        json={"text": "There is a pothole on the road."},
        headers=headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["category"] == "road_damage"
    assert body["ai_provider"] == "demo"  # never falsely claims cloud output
