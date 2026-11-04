"""OpenAI-compatible cloud LLM client (provider-independent interface).

Any service exposing the OpenAI chat-completions API works via
OPENAI_BASE_URL + OPENAI_MODEL + OPENAI_API_KEY. With AI_GATEWAY_ENABLED the
same request goes through the in-process Respan Gateway (see providers/gateway.py)
instead of straight to the provider. All output is validated as JSON by the
caller; any failure raises and the caller falls back to the demo engine — the
response is never falsely labelled as cloud-generated.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings
from app.services.providers import gateway as gateway_provider

logger = logging.getLogger("civicconnect.ai.providers")


class LLMUnavailable(Exception):
    """Cloud provider missing, timed out, or returned unusable output."""


async def chat_completion_json(
    system: str,
    user: str,
    schema_hint: str,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    """Request a JSON object from the cloud LLM and parse it defensively."""
    if not settings.cloud_enabled:
        raise LLMUnavailable("cloud provider not configured")

    url = f"{settings.openai_base_url}/chat/completions"
    model = settings.openai_model

    if transport is None and gateway_provider.enabled():
        try:
            transport = gateway_provider.async_transport()
        except gateway_provider.GatewayUnavailable as exc:
            raise LLMUnavailable(str(exc)) from exc
        # The in-process transport ignores the host: request the stable route
        # name and let the gateway pick the real model and provider.
        url = gateway_provider.GATEWAY_URL
        model = gateway_provider.CLOUD_ROUTE

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    timeout = httpx.Timeout(settings.llm_timeout_seconds)
    try:
        async with httpx.AsyncClient(timeout=timeout, transport=transport) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        raise LLMUnavailable(f"llm request failed: {exc}") from exc
    except (json.JSONDecodeError, ValueError) as exc:
        raise LLMUnavailable(f"llm returned non-json: {exc}") from exc

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMUnavailable("llm response missing choices") from exc

    return _parse_json_object(content)


def _parse_json_object(content: str) -> dict[str, Any]:
    """Parse JSON from a model reply, tolerating code fences and preamble."""
    if isinstance(content, dict):  # type: ignore[unreachable]
        return content
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", text).strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    # last resort: first {...} block
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError as exc:
            raise LLMUnavailable(f"could not parse llm json: {exc}") from exc
    raise LLMUnavailable("llm reply was not a JSON object")
