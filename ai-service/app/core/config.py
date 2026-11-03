"""Environment settings for the CivicConnect AI service."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load ai-service/.env if present (never committed)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    def __init__(self) -> None:
        self.service_key: str = os.getenv("AI_SERVICE_KEY", "ccai-internal-service-key-demo")
        self.provider: str = os.getenv("AI_PROVIDER", "demo").strip().lower()
        self.openai_api_key: str = os.getenv("OPENAI_API_KEY", "") or ""
        self.openai_base_url: str = (
            os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") or ""
        ).rstrip("/")
        self.openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.llm_timeout_seconds: float = float(os.getenv("AI_LLM_TIMEOUT_SECONDS", "20"))
        # Open-source Respan Gateway, in-process: routes the cloud provider
        # through one stable model name with retries and an optional fallback.
        self.gateway_enabled: bool = _flag("AI_GATEWAY_ENABLED")
        self.gateway_config_path: str = os.getenv("AI_GATEWAY_CONFIG", "") or ""
        self.gateway_fallback_model: str = os.getenv("AI_GATEWAY_FALLBACK_MODEL", "") or ""
        self.port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
        self.max_text_chars: int = int(os.getenv("AI_MAX_TEXT_CHARS", "4000"))
        self.log_level: str = os.getenv("AI_LOG_LEVEL", "INFO").upper()

    @property
    def cloud_enabled(self) -> bool:
        """True only when a cloud provider is configured with a key."""
        return self.provider == "openai" and bool(self.openai_api_key)


settings = Settings()

SUPPORTED_LANGUAGES = ("en", "kn", "hi")
LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "other": "Other",
}
