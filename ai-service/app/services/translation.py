"""TranslationService — cloud LLM when configured, honest demo fallback otherwise.

The original text is never overwritten: every response carries the original
alongside the translation and the provider actually used.
"""
from __future__ import annotations

import logging
import re

from app.schemas.ai import TranslateResponse
from app.services.lexicons import TRANSLATION_PHRASES, WORD_DICT
from app.utils.text import normalize_text

logger = logging.getLogger("civicconnect.ai.translation")


def _detect_script_lang(text: str) -> str:
    from app.services.language_detection import detect_language

    return detect_language(text).language


class TranslationService:
    def __init__(self) -> None:
        # reverse maps for demo word-level translation
        self._en_to_kn: dict[str, str] = {}
        self._en_to_hi: dict[str, str] = {}
        self._kn_to_en: dict[str, str] = {}
        self._hi_to_en: dict[str, str] = {}
        for key, value in WORD_DICT.items():
            if key.endswith("|hi"):
                word = key[:-3]
                self._en_to_hi[word] = value
                self._hi_to_en[value] = word
            else:
                self._en_to_kn[key] = value
                self._kn_to_en[value] = key

    async def translate(
        self, text: str, target_language: str, source_language: str | None = None
    ) -> TranslateResponse:
        text = normalize_text(text)
        source = source_language or _detect_script_lang(text)
        if source == target_language or not text:
            return TranslateResponse(
                original_text=text,
                translated_text=text,
                source_language=source,
                target_language=target_language,
                provider="identity",
            )

        # 1) Cloud LLM path (when configured) — validated, fallback-safe
        if target_language in ("en", "kn", "hi"):
            cloud = await self._cloud_translate(text, source, target_language)
            if cloud is not None:
                return TranslateResponse(
                    original_text=text,
                    translated_text=cloud,
                    source_language=source,
                    target_language=target_language,
                    provider="openai",
                )

        # 2) Demo phrase-table fallback
        translated = self._demo_translate(text, source, target_language)
        return TranslateResponse(
            original_text=text,
            translated_text=translated,
            source_language=source,
            target_language=target_language,
            provider="demo_phrase_table",
        )

    async def _cloud_translate(
        self, text: str, source: str, target: str
    ) -> str | None:
        from app.core.config import settings

        if not settings.cloud_enabled:
            return None
        try:
            from app.services.providers.openai_compat import chat_completion_json

            data = await chat_completion_json(
                system=(
                    "You are a precise translator for Indian civic complaints. "
                    "Translate the user's text into the target language. "
                    "Preserve meaning, place names and numbers. Reply with JSON "
                    '{"translated_text": "..."} only.'
                ),
                user=f"Target language code: {target}\nText: {text}",
                schema_hint='{"translated_text": string}',
            )
            out = (data or {}).get("translated_text")
            return out.strip() if isinstance(out, str) and out.strip() else None
        except Exception as exc:  # noqa: BLE001 — fall back to demo
            logger.warning("cloud translation failed, using demo fallback: %s", exc)
            return None

    def _demo_translate(self, text: str, source: str, target: str) -> str:
        # (a) whole-phrase matches from the civic phrase table
        for phrase in TRANSLATION_PHRASES.values():
            src_line = phrase.get(source, "")
            if src_line and (src_line == text or src_line in text or text in src_line):
                return phrase.get(target, text)

        # (b) word-level dictionary with language pivoting via English
        words = re.findall(r"[\w'']+|[^\w\s]", text, re.UNICODE)
        out: list[str] = []
        for token in words:
            key = token.lower()
            replacement: str | None = None
            if source == "en" and target == "kn":
                replacement = self._en_to_kn.get(key)
            elif source == "en" and target == "hi":
                replacement = self._en_to_hi.get(key)
            elif source == "kn" and target == "en":
                replacement = self._kn_to_en.get(key)
            elif source == "kn" and target == "hi":
                en = self._kn_to_en.get(key)
                if en:
                    replacement = self._en_to_hi.get(en)
            elif source == "hi" and target == "en":
                replacement = self._hi_to_en.get(key)
            elif source == "hi" and target == "kn":
                en = self._hi_to_en.get(key)
                if en:
                    replacement = self._en_to_kn.get(en)
            out.append(replacement if replacement else token)
        result = " ".join(out)
        # honest marker: demo translation is best-effort
        return result if result.strip() else text


translation_service = TranslationService()
