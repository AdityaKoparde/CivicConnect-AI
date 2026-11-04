"""EntityExtractionService — gazetteer + pattern extraction for civic complaints.

Extracts district/taluk/city/ward/landmark/local body, duration, problem type
and safety details. Geographic names come from public gazetteers; the service
never invents a value that is not present in the text.
"""
from __future__ import annotations

import re

from app.schemas.ai import Entities
from app.services.lexicons import (
    CITIES,
    DISTRICTS,
    DURATION_PATTERNS,
    LANDMARKS,
    LOCAL_BODY_WORDS,
    ROAD_TYPE_WORDS,
    TALUKS,
    _UNIT_DAYS,
)
from app.utils.text import digits_or_words_to_int, fold_for_match

_WARD_RE = re.compile(
    r"ward\s*(?:no\.?|number)?\s*(\d{1,3})|ವಾರ್ಡ್\s*(\d{1,3})|वार्ड\s*(\d{1,3})",
    re.IGNORECASE,
)

# Kannada dependent vowel signs + virama — stripped to build matching stems so
# "ಮೈಸೂರಿನ" (Mysuru-in) matches the gazetteer entry "ಮೈಸೂರು".
_KN_TAIL = "ಾಿೀುೂೆೇೈೊೋೌ್ಂಃ"


def _alias_forms(alias: str) -> list[str]:
    """Exact alias + (for Kannada) its de-inflected stem for substring match."""
    forms = [alias]
    if any("\u0c80" <= ch <= "\u0cff" for ch in alias):
        stem = alias.rstrip(_KN_TAIL)
        if stem != alias and len(stem) >= 4:
            forms.append(stem)
    return forms


def _gazetteer_match(haystack: str, alias: str) -> bool:
    return any(form in haystack for form in _alias_forms(alias))


# English "problem type" hints mapped to canonical problem_type values
PROBLEM_TYPE_PATTERNS: dict[str, list[str]] = {
    "pothole": ["pothole", "ಗುಂಡಿ", "गड्ढा", "गड्ढों"],
    "water_leak": ["leak", "ಒಸರು", "रिसाव", "pipe burst", "ಪೈಪ್ ಒಡೆದ"],
    "power_outage": ["power cut", "no electricity", "ವಿದ್ಯುತ್ ಇಲ್ಲ", "बिजली नहीं"],
    "overflow": ["overflow", "ತುಂಬಿ", "बाहर आ", "spill"],
    "broken": ["broken", "damaged", "ಹಾಳು", "ಟೂटी", "क्षतिग्रस्त", "टूटा"],
    "not_working": ["not working", "doesn't work", "ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ", "काम नहीं"],
    "delay": ["delay", "not collected", "ಆಗುತ್ತಿಲ್ಲ", "नहीं हो रहा"],
    "blocked": ["blocked", "clogged", "jam", "ತುಂಬಿ", "जाम"],
    "accident": ["accident", "ಅಪಘात", "दुर्घटना"],
}

SAFETY_DETAIL_PATTERNS: list[str] = [
    "accident happened", "accident occurred", "someone got hurt", "child fell",
    "car hit", "bike skid", "accident ಆಯಿತು", "ಅಪಘಾತ ಆಗಿದೆ", "ಗಾಯವಾಗಿದೆ",
    "घायल हो गया", "चोट लगी", "accident हो गया",
]


class EntityExtractionService:
    def extract(self, text: str, language: str | None = None) -> Entities:
        folded = fold_for_match(text)
        raw_lower = text.lower()
        entities = Entities()

        # --- district (check multi-word districts first) ---
        for district, aliases in sorted(DISTRICTS.items(), key=lambda kv: -len(kv[0])):
            for alias in sorted(aliases, key=len, reverse=True):
                if _gazetteer_match(folded, alias) or _gazetteer_match(raw_lower, alias):
                    entities.district = district
                    break
            if entities.district:
                break

        # --- city ---
        for city, aliases in sorted(CITIES.items(), key=lambda kv: -len(kv[0])):
            for alias in sorted(aliases, key=len, reverse=True):
                if _gazetteer_match(folded, alias) or _gazetteer_match(raw_lower, alias):
                    # City name often doubles as district alias; keep both
                    entities.city = city
                    break
            if entities.city:
                break

        # --- taluk (only meaningful when it matches its district's list) ---
        for taluk_district, aliases in TALUKS.items():
            for alias in sorted(aliases, key=len, reverse=True):
                if _gazetteer_match(folded, alias) or _gazetteer_match(raw_lower, alias):
                    if entities.district is None or entities.district == taluk_district:
                        entities.taluk = alias.title() if alias.isascii() else alias
                    break
            if entities.taluk:
                break

        # --- ward ---
        ward_m = _WARD_RE.search(text)
        if ward_m:
            digits = next(g for g in ward_m.groups() if g)
            entities.ward = f"Ward {digits}"

        # --- landmark (longest first) ---
        for lm in sorted(LANDMARKS, key=len, reverse=True):
            if _gazetteer_match(folded, lm) or _gazetteer_match(raw_lower, lm):
                entities.landmark = lm.title() if lm.isascii() else lm
                break

        # --- local body mention ---
        for lb in sorted(LOCAL_BODY_WORDS, key=len, reverse=True):
            if lb in folded or lb in raw_lower:
                entities.local_body = lb.title() if lb.isascii() else lb
                break

        # --- road type ---
        for road_type, words in ROAD_TYPE_WORDS.items():
            for w in sorted(words, key=len, reverse=True):
                if w in folded or w in raw_lower:
                    entities.road_type = road_type  # type: ignore[assignment]
                    break
            if entities.road_type:
                break

        # --- duration ---
        for pattern in DURATION_PATTERNS:
            m = re.search(pattern, folded if pattern.startswith(r"(?:for|since|past|last)") else text, re.IGNORECASE)
            if not m:
                m = re.search(pattern, text, re.IGNORECASE)
            if m:
                num = digits_or_words_to_int(m.group(1))
                unit = m.group(2).lower()
                if num is not None:
                    days = num * _UNIT_DAYS.get(unit, 1)
                    if 0 < days <= 3650:
                        entities.duration_days = days
                break

        # --- problem type ---
        for ptype, patterns in PROBLEM_TYPE_PATTERNS.items():
            for p in patterns:
                if p in folded or p in raw_lower:
                    entities.problem_type = ptype
                    break
            if entities.problem_type:
                break

        # --- safety details ---
        for p in SAFETY_DETAIL_PATTERNS:
            if p in folded or p in raw_lower:
                entities.safety_details = p
                break

        return entities


entity_extraction_service = EntityExtractionService()
