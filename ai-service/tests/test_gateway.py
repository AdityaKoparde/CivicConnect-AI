"""Respan Gateway integration: the cloud classification path goes through the
in-process gateway to a local OpenAI-compatible provider fixture.

No real provider is called and no provider key is collected — the fixture
records what the gateway actually sent (route resolved to a real model, the
provider key forwarded) so the routing itself is what gets verified.
"""
from __future__ import annotations

import json
import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import pytest

from app.core.config import settings
from app.services.providers import gateway as gateway_provider

FIXTURE_KEY = "sk-fixture-not-a-real-key"
PRIMARY_MODEL = "fixture-primary-model"
FALLBACK_MODEL = "fixture-fallback-model"


def _fixture_reply(model: str) -> dict[str, Any]:
    """An OpenAI chat-completion whose content is the JSON the caller expects."""
    content = json.dumps(
        {
            "category": "road_damage",
            "normalized_description": "Pothole reported on a city road.",
            "district": "Bengaluru Urban",
            "landmark": "Sector 4",
            "reasoning": "fixture provider reply",
        }
    )
    return {
        "id": "chatcmpl-fixture",
        "object": "chat.completion",
        "created": 0,
        "model": model,
        "choices": [
            {
                "index": 0,
                "finish_reason": "stop",
                "message": {"role": "assistant", "content": content},
            }
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
    }


@pytest.fixture()
def provider_fixture() -> Iterator[dict[str, Any]]:
    """A loopback OpenAI-compatible endpoint; `failing` models answer 500."""
    calls: list[dict[str, Any]] = []
    failing: set[str] = set()

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802 — http.server naming
            raw = self.rfile.read(int(self.headers.get("content-length", 0)) or 0)
            payload = json.loads(raw or b"{}")
            calls.append(
                {
                    "path": self.path,
                    "model": payload.get("model"),
                    "auth": self.headers.get("authorization"),
                    "response_format": payload.get("response_format"),
                }
            )
            if payload.get("model") in failing:
                data = json.dumps({"error": {"message": "fixture provider failure"}}).encode()
                self.send_response(500)
            else:
                data = json.dumps(_fixture_reply(payload.get("model", ""))).encode()
                self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *args: Any) -> None:  # keep pytest output clean
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield {
            "base_url": f"http://127.0.0.1:{server.server_address[1]}/v1",
            "calls": calls,
            "failing": failing,
        }
    finally:
        server.shutdown()
        server.server_close()


def _use_gateway(monkeypatch: pytest.MonkeyPatch, fixture: dict[str, Any]) -> None:
    """Point the cloud provider at the fixture and switch the gateway on."""
    monkeypatch.setenv("OPENAI_API_KEY", FIXTURE_KEY)
    monkeypatch.setattr(settings, "provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", FIXTURE_KEY)
    monkeypatch.setattr(settings, "openai_base_url", fixture["base_url"])
    monkeypatch.setattr(settings, "openai_model", PRIMARY_MODEL)
    monkeypatch.setattr(settings, "gateway_enabled", True)
    monkeypatch.setattr(settings, "gateway_fallback_model", "")


def test_classification_routes_through_gateway(client, headers, monkeypatch, provider_fixture):
    _use_gateway(monkeypatch, provider_fixture)
    try:
        r = client.post(
            "/api/v1/ai/classify-complaint",
            json={"text": "There is a big pothole near the school."},
            headers=headers,
        )
    finally:
        gateway_provider.shutdown()

    assert r.status_code == 200, r.text
    body = r.json()
    # The cloud reply came back through the gateway, so it is honestly labelled.
    assert body["ai_provider"] == "openai"
    assert body["category"] == "road_damage"
    assert body["entities"]["district"] == "Bengaluru Urban"
    assert body["reasoning"].startswith("[cloud]")

    assert len(provider_fixture["calls"]) == 1
    call = provider_fixture["calls"][0]
    assert call["path"] == "/v1/chat/completions"
    assert call["model"] == PRIMARY_MODEL  # route resolved to the real model
    assert call["auth"] == f"Bearer {FIXTURE_KEY}"  # gateway forwarded the key
    assert call["response_format"] == {"type": "json_object"}


def test_gateway_retries_then_falls_back_to_spare_model(
    client, headers, monkeypatch, provider_fixture
):
    _use_gateway(monkeypatch, provider_fixture)
    monkeypatch.setattr(settings, "gateway_fallback_model", FALLBACK_MODEL)
    provider_fixture["failing"].add(PRIMARY_MODEL)
    try:
        r = client.post(
            "/api/v1/ai/classify-complaint",
            json={"text": "Street light is broken and the road is dug up."},
            headers=headers,
        )
    finally:
        gateway_provider.shutdown()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ai_provider"] == "openai"
    assert body["category"] == "road_damage"
    # Two tries on the primary model, then the spare model answers.
    assert [c["model"] for c in provider_fixture["calls"]] == [
        PRIMARY_MODEL,
        PRIMARY_MODEL,
        FALLBACK_MODEL,
    ]


def test_gateway_disabled_keeps_direct_provider_path(client, headers, monkeypatch):
    """AI_GATEWAY_ENABLED is opt-in; the default cloud path is unchanged."""
    monkeypatch.setattr(settings, "gateway_enabled", False)
    assert gateway_provider.enabled() is False
