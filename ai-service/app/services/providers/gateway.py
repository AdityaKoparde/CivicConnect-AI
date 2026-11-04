"""In-process Respan Gateway for the cloud LLM provider.

The open-source gateway (https://github.com/respanai/respan-gateway) runs inside
this process — no socket, no account, no hosted credits. When
``AI_GATEWAY_ENABLED`` is set, cloud calls stop addressing the provider directly
and go through a stable route name instead: the gateway maps that route to the
configured OpenAI-compatible endpoint and model, retries a failing model, and
falls back to the optional spare model (``AI_GATEWAY_FALLBACK_MODEL``).

Credentials are unchanged: the gateway reads ``OPENAI_API_KEY`` through an
``env:`` reference, so no secret is written to source, to a gateway.toml, or to
a log. The provider key is the developer's own, exactly as before.
"""
from __future__ import annotations

import logging
import threading
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger("civicconnect.ai.gateway")

# The model name this service asks for; the gateway resolves it via the route.
CLOUD_ROUTE = "civic-classifier"
PROVIDER_NAME = "civic-provider"
# In-process transport intercepts the request; only the path reaches the gateway.
GATEWAY_URL = "http://respan-gateway/v1/chat/completions"


class GatewayUnavailable(Exception):
    """The gateway could not be built or the configuration was rejected."""


_lock = threading.Lock()
_gateway: Any = None
_cache_key: tuple[Any, ...] | None = None


def enabled() -> bool:
    """True only when the gateway is switched on for a configured cloud provider."""
    return bool(settings.gateway_enabled and settings.cloud_enabled)


def _config_key() -> tuple[Any, ...]:
    return (
        settings.gateway_config_path,
        settings.openai_base_url,
        settings.openai_api_key,
        settings.openai_model,
        settings.gateway_fallback_model,
    )


def _gateway_config() -> dict[str, Any]:
    provider: dict[str, Any] = {
        "formats": ["openai-chat"],
        "base_url": settings.openai_base_url,
    }
    if settings.openai_api_key:
        provider["key"] = "env:OPENAI_API_KEY"
    candidates = [f"{PROVIDER_NAME}/{settings.openai_model}"]
    if settings.gateway_fallback_model:
        candidates.append(f"{PROVIDER_NAME}/{settings.gateway_fallback_model}")
    return {
        # In-process gateways stay quiet; the service logs its own requests.
        "log": "off",
        "providers": {PROVIDER_NAME: provider},
        "routes": {
            CLOUD_ROUTE: {"to": candidates, "tries": 2, "backoff": "200ms"},
        },
    }


def get_gateway() -> Any:
    """Return the process-wide gateway, rebuilding it if the config changed."""
    global _gateway, _cache_key
    key = _config_key()
    with _lock:
        if _gateway is not None and key == _cache_key:
            return _gateway
        if _gateway is not None:
            _close(_gateway)
        try:
            import respan_gateway as rg

            if settings.gateway_config_path:
                _gateway = rg.Gateway.from_file(settings.gateway_config_path)
            else:
                _gateway = rg.Gateway(config=_gateway_config())
        except Exception as exc:  # ConfigError / GatewayError / import failure
            _gateway = None
            _cache_key = None
            raise GatewayUnavailable(f"respan gateway unavailable: {exc}") from exc
        _cache_key = key
    logger.info(
        "respan gateway ready | route=%s -> %s | fallback=%s",
        CLOUD_ROUTE,
        settings.openai_model,
        settings.gateway_fallback_model or "none",
    )
    return _gateway


def async_transport() -> httpx.AsyncBaseTransport:
    """An httpx transport that sends requests to the in-process gateway."""
    return get_gateway().async_transport()


def shutdown() -> None:
    """Close the gateway (called from the FastAPI shutdown event)."""
    global _gateway, _cache_key
    with _lock:
        if _gateway is not None:
            _close(_gateway)
        _gateway = None
        _cache_key = None


def _close(gateway: Any) -> None:
    try:
        gateway.close()
    except Exception as exc:  # pragma: no cover - shutdown is best effort
        logger.warning("respan gateway close failed: %s", exc)
