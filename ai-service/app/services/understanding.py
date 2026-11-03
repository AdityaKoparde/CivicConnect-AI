"""MultilingualUnderstandingService — orchestrates every AI sub-service into
one validated AIUnderstanding object. This is the pipeline Node.js relies on:
detect language → extract entities → classify → detect emergency →
assess priority → recommend department → calibrate confidence.
"""
from __future__ import annotations

import logging

from app.core.config import settings
from app.schemas.ai import AIUnderstanding, Entities
from app.services.classification import classification_service, category_label
from app.services.department_recommendation import department_recommendation_service
from app.services.emergency import emergency_detection_service
from app.services.entity_extraction import entity_extraction_service
from app.services.language_detection import detect_language, resolve_reply_language
from app.services.priority import priority_assessment_service
from app.utils.text import clip, fold_for_match, normalize_text

logger = logging.getLogger("civicconnect.ai.understanding")

# English canonical summaries per category (normalized text is for internal use)
_CANONICAL_SUMMARY: dict[str, str] = {
    "road_damage": "Road surface damage (potholes or breakage) reported.",
    "water_supply": "Water supply disruption reported.",
    "drainage_sewage": "Drainage or sewage problem reported.",
    "garbage_collection": "Garbage not collected / sanitation problem reported.",
    "electricity": "Electricity supply problem reported.",
    "streetlights": "Streetlight not working reported.",
    "public_health": "Public health / hygiene concern reported.",
    "government_hospitals": "Government hospital service issue reported.",
    "public_transport": "Public transport service issue reported.",
    "road_safety": "Road safety infrastructure issue reported.",
    "environmental_pollution": "Environmental pollution reported.",
    "public_infrastructure": "Public infrastructure damage reported.",
    "animal_welfare": "Animal welfare concern reported.",
    "fire_emergency": "Fire or emergency incident reported.",
    "other": "Civic issue reported.",
}


class MultilingualUnderstandingService:
    """One-stop structured understanding for a complaint message."""

    def understand(self, text: str, language: str | None = None) -> AIUnderstanding:
        original = normalize_text(text)
        detected = detect_language(original)
        lang = resolve_reply_language(detected.language, language)

        entities = entity_extraction_service.extract(original, lang)
        cls = classification_service.classify(original)
        emergency = emergency_detection_service.detect(original)
        safety = bool(emergency.is_emergency) or bool(
            emergency_detection_service.safety_signal(original)
        ) or bool(entities.safety_details)

        prio = priority_assessment_service.assess(
            original, entities, safety, cls.category, emergency.is_emergency
        )
        dept = department_recommendation_service.recommend(
            cls.category, entities, entities.district
        )

        # Confidence calibration: geography + confident detection add a little.
        confidence = cls.confidence
        if entities.district or entities.city:
            confidence = min(0.97, confidence + 0.03)
        if detected.language in ("kn", "hi") and detected.confidence >= 0.8:
            confidence = min(0.97, confidence + 0.02)
        if cls.category == "other":
            confidence = min(confidence, 0.55)

        requires_review = confidence < 0.65 or cls.category == "other"

        reasoning_parts = []
        if cls.top_keywords:
            reasoning_parts.append(
                f"Matched signals: {', '.join(cls.top_keywords[:3])}"
            )
        elif cls.ml_category:
            reasoning_parts.append(
                f"ML model suggestion: {cls.ml_category} "
                f"(p={cls.ml_probability})"
            )
        reasoning_parts.append(f"Classifier method: {cls.method}")
        if emergency.is_emergency:
            reasoning_parts.append(f"Emergency pattern: {emergency.matched_pattern}")
        reasoning_parts.append(dept.reasoning)

        return AIUnderstanding(
            original_text=original,
            detected_language=detected.language,
            normalized_description=self._normalize(cls.category, entities, original),
            category=cls.category,
            category_label=category_label(cls.category),
            entities=entities,
            priority=prio.priority,
            safety_risk=safety,
            emergency=emergency.is_emergency,
            recommended_department=dept.recommended_department,
            confidence=round(confidence, 2),
            reasoning=" ".join(reasoning_parts),
            requires_manual_review=requires_review,
            ai_provider="openai" if settings.cloud_enabled else "demo",
            classification_method=cls.method,
        )

    @staticmethod
    def _normalize(category: str, entities: Entities, original: str) -> str:
        base = _CANONICAL_SUMMARY.get(category, _CANONICAL_SUMMARY["other"])
        parts = [base]
        where: list[str] = []
        if entities.landmark:
            where.append(f"near {entities.landmark.lower()}")
        if entities.city:
            where.append(entities.city)
        elif entities.district:
            where.append(f"{entities.district} district")
        if where:
            parts.append("Location: " + ", ".join(where) + ".")
        if entities.duration_days:
            parts.append(f"Ongoing for about {entities.duration_days} day(s).")
        if entities.safety_details:
            parts.append("Safety impact reported.")
        if len(parts) == 1:
            # No structured context: use a clipped, whitespace-normalised original
            parts.append(clip(original, 160))
        return " ".join(parts)

    async def understand_with_cloud(self, text: str, language: str | None = None) -> AIUnderstanding:
        """Cloud-enriched understanding with silent demo fallback."""
        local = self.understand(text, language)
        if not settings.cloud_enabled:
            return local
        try:
            from app.schemas.ai import ChatRequest  # local import to avoid cycles
            from app.services.providers.openai_compat import chat_completion_json

            data = await chat_completion_json(
                system=(
                    "You classify Indian civic grievances. Reply with JSON: "
                    '{"category": one of the 15 known keys, "normalized_description": '
                    'short English summary, "district": string|null, "landmark": '
                    'string|null, "reasoning": string}. Categories: road_damage, '
                    "water_supply, drainage_sewage, garbage_collection, electricity, "
                    "streetlights, public_health, government_hospitals, "
                    "public_transport, road_safety, environmental_pollution, "
                    "public_infrastructure, animal_welfare, fire_emergency, other."
                ),
                user=text,
                schema_hint='{"category": "...", "normalized_description": "..."}',
            )
            known = category_label(data.get("category", ""))
            if not known:
                raise ValueError(f"unknown category from llm: {data.get('category')}")
            # Merge cloud hints into the locally-computed (fully validated) object
            local.category = data["category"]
            local.category_label = category_label(local.category)
            if isinstance(data.get("normalized_description"), str):
                local.normalized_description = data["normalized_description"][:500]
            if isinstance(data.get("district"), str) and data["district"].strip():
                local.entities.district = data["district"].strip()[:80]
            if isinstance(data.get("landmark"), str) and data["landmark"].strip():
                local.entities.landmark = data["landmark"].strip()[:120]
            if isinstance(data.get("reasoning"), str):
                local.reasoning = f"[cloud] {data['reasoning'][:400]}"
            local.ai_provider = "openai"
            # Re-run dependent steps for the updated category
            dept = department_recommendation_service.recommend(
                local.category, local.entities, local.entities.district
            )
            local.recommended_department = dept.recommended_department
            return local
        except Exception as exc:  # noqa: BLE001 — demo fallback is a feature
            logger.warning("cloud understanding failed, demo output used: %s", exc)
            local.ai_provider = "demo"
            return local


understanding_service = MultilingualUnderstandingService()
