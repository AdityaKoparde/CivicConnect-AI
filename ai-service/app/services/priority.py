"""PriorityAssessmentService — rule-scored urgency from real signals.

Deliberately conservative: a routine complaint with no safety/duration/scope
signals lands at LOW/MEDIUM. HIGH and CRITICAL require accumulated evidence.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.schemas.ai import Entities, PriorityLiteral
from app.utils.text import fold_for_match

# Category base urgency weights
_CATEGORY_WEIGHT: dict[str, float] = {
    "fire_emergency": 0.35,
    "road_safety": 0.20,
    "electricity": 0.15,
    "public_health": 0.15,
    "water_supply": 0.10,
    "government_hospitals": 0.10,
    "drainage_sewage": 0.08,
    "road_damage": 0.05,
    "garbage_collection": 0.03,
    "streetlights": 0.02,
    "environmental_pollution": 0.05,
    "public_transport": 0.02,
    "public_infrastructure": 0.03,
    "animal_welfare": 0.05,
    "other": 0.05,
}

_SCOPE_WORDS: list[str] = [
    "whole area", "entire street", "all houses", "everyone", "entire road",
    "whole road", "all the people", "entire colony",
    "ಇಡೀ", "ಎಲ್ಲಾ ಮನೆ", "ಇಡೀ ರಸ್ತೆ", "ಪೂರ್ಣ",
    "पूरे", "सभी", "पूरी", "इलाके भर",
]

_CRITICAL_INFRA_WORDS: list[str] = [
    "hospital", "school", "children", "drinking water", "patient",
    "ಆಸ್ಪತ್ರೆ", "ಶಾಲೆ", "ಮಕ್ಕಳು", "ಕುಡಿಯುವ ನೀರು",
    "अस्पताल", "स्कूल", "बच्चे", "पीने का पानी",
]

_SEVERITY_WORDS: list[str] = [
    "completely", "fully", "entirely", "totally", "worst", "very bad",
    "ತುಂಬಾ", "ಸಂಪೂರ್ಣ", "ಬಹಳ",
    "बिल्कुल", "पूरी", "बहुत खराब",
]

_IMMEDIATE_THREAT_WORDS: list[str] = [
    "exposed", "live wire", "sparking", "open wire", "dangerous", "may fall",
    "deep hole", "risk of",
    "ನಗ್ನ", "ಅಪಾಯಕಾರಿ", "ಸ್ಪಾರ್ಕ್",
    "खुला", "खतरनाक", "स्पार्क",
]


@dataclass
class PriorityResult:
    priority: PriorityLiteral
    score: float
    factors: list[str]


class PriorityAssessmentService:
    def assess(
        self,
        text: str,
        entities: Entities | None = None,
        safety_risk: bool = False,
        category: str = "other",
        is_emergency: bool = False,
    ) -> PriorityResult:
        folded = fold_for_match(text)
        score = 0.0
        factors: list[str] = []

        base = _CATEGORY_WEIGHT.get(category, 0.05)
        if base:
            score += base
            factors.append(f"category:{category}(+{base:.2f})")

        if is_emergency:
            score += 0.55
            factors.append("immediate emergency(+0.55)")

        if safety_risk:
            score += 0.25
            factors.append("safety risk(+0.25)")
            if any(w in folded for w in _IMMEDIATE_THREAT_WORDS):
                score += 0.15
                factors.append("immediate threat words(+0.15)")

        if entities:
            if entities.duration_days is not None:
                d = entities.duration_days
                if d >= 30:
                    score += 0.15
                    factors.append(f"duration {d}d(+0.15)")
                elif d >= 7:
                    score += 0.10
                    factors.append(f"duration {d}d(+0.10)")
                elif d >= 3:
                    score += 0.05
                    factors.append(f"duration {d}d(+0.05)")
            if entities.safety_details:
                score += 0.10
                factors.append("reported harm(+0.10)")

        if any(w in folded for w in _SCOPE_WORDS):
            score += 0.15
            factors.append("wide area affected(+0.15)")

        if any(w in folded for w in _CRITICAL_INFRA_WORDS):
            score += 0.10
            factors.append("critical infrastructure(+0.10)")

        if any(w in folded for w in _SEVERITY_WORDS):
            score += 0.05
            factors.append("severity language(+0.05)")

        score = round(min(1.0, score), 3)
        if score >= 0.75:
            priority: PriorityLiteral = "critical"
        elif score >= 0.55:
            priority = "high"
        elif score >= 0.30:
            priority = "medium"
        else:
            priority = "low"
        return PriorityResult(priority=priority, score=score, factors=factors)


priority_assessment_service = PriorityAssessmentService()
