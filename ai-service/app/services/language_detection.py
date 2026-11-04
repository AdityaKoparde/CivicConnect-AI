"""LanguageDetectionService — deterministic Unicode-script + lexicon detection.

Why not a downloaded model: script detection is exact for Kannada/Devanagari
(Latin ambiguity only matters between English and other Latin scripts, which the
supported-language lexicon resolves). Zero model downloads, works offline,
fully testable — and it is the right call for a hackathon demo that must run
anywhere. Cloud LLM path can still confirm the language when configured.
"""
from __future__ import annotations

from app.core.config import SUPPORTED_LANGUAGES
from app.schemas.ai import DetectLanguageResponse
from app.utils.text import fold_for_match, normalize_text, script_profile

# Lightweight stopword/indicator lexicons per language
_INDICATORS: dict[str, list[str]] = {
    "en": [
        "the", "is", "there", "near", "my", "our", "have", "has", "been", "not",
        "water", "road", "street", "light", "garbage", "complaint", "house",
        "please", "help", "since", "days", "ago", "what", "when", "where",
    ],
    "hi": [
        "है", "हमारे", "की", "को", "से", "में", "नहीं", "आ", "रहा", "रही", "पानी",
        "सड़क", "दिनों", "से", "कचरा", "बिजली", "कृपया", "हम", "यह", "पर",
    ],
    "kn": [
        "ಆಗಿದೆ", "ಇದೆ", "ನಮ್ಮ", "ನೀರು", "ರಸ್ತೆ", "ಕಸ", "ದಿನಗಳ", "ಬಿದ್ದಿದೆ",
        "ಆಗುತ್ತಿದೆ", "ಇಲ್ಲ", "ದಯವಿಟ್ಟು", "ನಿಮ್ಮ", "ಇದರಿಂದ", "ತುಂಬಾ", "ಮಾಡಿ",
    ],
}

# Multi-char indicators are stronger evidence than single short words
_WEIGHTED_INDICATORS: dict[str, list[str]] = {
    "en": ["there is", "there are", "i am", "my ", "not working", "since"],
    "hi": ["नहीं आ", "रहा है", "रही है", "हमारे", "दिनों से", "से है"],
    "kn": ["ಆಗಿದೆ", "ಇದೆ", "ದಿನಗಳಿಂದ", "ಬಿದ್ದಿದೆ", "ತುಂಬಾ", "ಇಲ್ಲ"],
}


def detect_language(text: str) -> DetectLanguageResponse:
    text = normalize_text(text)
    if not text:
        return DetectLanguageResponse(language="other", confidence=0.0, supported=False)

    profile = script_profile(text)
    total_letters = sum(profile.values())
    if total_letters == 0:
        # digits/punctuation only — cannot tell
        return DetectLanguageResponse(language="other", confidence=0.0, supported=False)

    kn_ratio = profile["kn"] / total_letters
    hi_ratio = profile["hi"] / total_letters
    latin_ratio = profile["latin"] / total_letters

    if kn_ratio >= 0.30:
        conf = min(0.99, 0.70 + kn_ratio)
        return DetectLanguageResponse(language="kn", confidence=round(conf, 2), supported=True)
    if hi_ratio >= 0.30:
        conf = min(0.99, 0.70 + hi_ratio)
        return DetectLanguageResponse(language="hi", confidence=round(conf, 2), supported=True)

    if latin_ratio >= 0.60:
        # Latin script: English vs other Latin languages — English indicators win
        folded = fold_for_match(text)
        words = set(folded.split())
        en_hits = sum(1 for w in _INDICATORS["en"] if w in words)
        weighted_hits = sum(1 for p in _INDICATORS["en"] if p in folded)
        if en_hits + weighted_hits >= 2:
            conf = min(0.98, 0.72 + 0.06 * (en_hits + weighted_hits))
            return DetectLanguageResponse(language="en", confidence=round(conf, 2), supported=True)
        # Latin but not clearly English: still route as English with lower confidence
        # (all Latin-script complaint handling in this platform defaults to English)
        return DetectLanguageResponse(language="en", confidence=0.6, supported=True)

    # Mixed/other scripts: score indicator lexicons directly (Devanagari < 30% but present)
    best_lang, best_score = "other", 0.0
    folded = fold_for_match(text)
    for lang in ("kn", "hi", "en"):
        score = sum(2 for p in _WEIGHTED_INDICATORS[lang] if p in folded)
        score += sum(1 for w in _INDICATORS[lang] if w and (w in folded or w in text))
        if score > best_score:
            best_lang, best_score = lang, float(score)
    if best_score >= 3 and best_lang in SUPPORTED_LANGUAGES:
        return DetectLanguageResponse(
            language=best_lang,  # type: ignore[arg-type]
            confidence=round(min(0.9, 0.55 + best_score * 0.05), 2),
            supported=True,
        )
    return DetectLanguageResponse(language="other", confidence=0.4, supported=False)


def resolve_reply_language(detected: str, preferred: str | None) -> str:
    """Manual language selection always wins; otherwise the detected language;
    'other' falls back to English."""
    if preferred in SUPPORTED_LANGUAGES:
        return preferred
    if detected in SUPPORTED_LANGUAGES:
        return detected
    return "en"
