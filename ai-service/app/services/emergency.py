"""Emergency detection — immediate-danger signals across en/kn/hi.

Spec rule: when an emergency is detected the citizen is told, prominently, to
call 112 immediately. We never claim emergency services have been dispatched.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from app.services.lexicons import EMERGENCY_PATTERNS, SAFETY_PATTERNS
from app.utils.text import fold_for_match

logger = logging.getLogger("civicconnect.ai.emergency")

# Strong patterns: presence alone is enough to flag an emergency.
_STRONG_PATTERNS: list[str] = [
    # English
    "serious accident", "road accident", "fatal accident", "hit and run",
    "on fire", "catch fire", "catching fire", "house fire", "forest fire",
    "shop fire", "building on fire", "burning", "flames",
    "there is a fire", "fire broke out", "fire in my", "fire in the",
    "serious injury", "serious injuries", "bleeding", "unconscious",
    "building collapse", "wall collapse", "collapsed", "roof collapsed",
    "heart attack", "chest pain", "stroke",
    "exposed wire", "live wire", "open wire", "sparking wire", "sparking",
    "exposed electrical wire", "exposed electrical", "dangling wire",
    "hanging wire", "wire hanging", "naked wire",
    "electrocuted", "electric shock", "danger to life", "immediate danger",
    "life threat", "someone died", "people died", "death",
    # Kannada
    "ಅಪಘಾತ ಆಗಿದೆ", "ಅಪಘಾತವಾಗಿದೆ", "ರಕ್ತಸ್ರಾವ", "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ",
    "ಕುಸಿದಿದೆ", "ಕುಸಿದ", "ಬೆಂಕಿ ಹೊತ್ತಿಕೊಂಡ", "ಬೆಂಕಿ ಕಾಣಿಸಿಕೊಂಡ",
    "ಹೊತ್ತಿಕೊಂಡಿದೆ", "ನಗ್ನ ತಂತಿ", "ವಿದ್ಯುತ್ ಆಘಾತ", "ಸ್ಪಾರ್ಕ್ ಆಗುತ್ತಿದೆ",
    "ಜೀವಕ್ಕೆ ಅಪಾಯ", "ಸಾವು", "ಮೃತ", "ಗಾಯವಾಗಿದೆ",
    # Hindi
    "गंभीर दुर्घटना", "सड़क दुर्घटना", "आग लग", "जल रहा", "धमाका",
    "गंभीर चोट", "खून बह", "बेहोश", "इमारत गिर", "दीवार गिर",
    "दिल का दौरा", "छाती में दर्द", "नंगा तार", "स्पार्क",
    "करंट लग", "जान को खतरा", "मौत", "मर गया", "घायल हो गया",
]

# Bare words that only count as emergency with severity context nearby.
_CONTEXTUAL_PATTERNS: list[str] = [
    "accident", "ಅಪಘात", "दुर्घटना", "injured", "ಘಾಯ", "घायल",
    "fire", "ಬೆಂಕಿ", "आग", "collapse", "ಕುಸಿ", "गिर",
]
_SEVERITY_WORDS: list[str] = [
    "serious", "severe", "major", "fatal", "died", "dead", "death",
    "happened", "occurred", "just now", "immediately", "right now", "emergency",
    "ಗಂಭೀರ", "ಆಗಿದೆ", "ಆಯಿತು", "ಸಾವು",
    "गंभीर", "हो गया", "अभी", "मौत",
]


@dataclass
class EmergencyMatch:
    is_emergency: bool
    matched_pattern: str | None = None
    kind: str | None = None  # accident | fire | injury | electrical | collapse | medical | danger


_KIND_MAP = {
    "fire": ["fire", "burning", "flames", "ಬೆಂಕಿ", "ಹೊತ್ತಿ", "ಆಗ लग", "जल"],
    "accident": ["accident", "ಅಪಘात", "दुर्घटना"],
    "injury": ["injury", "injured", "bleeding", "unconscious", "ಗಾಯ", "ಘಾಯ", "चोट", "घायल", "खून", "बेहोश"],
    "electrical": ["wire", "sparking", "electrocuted", "ತಂತಿ", "ಸ್ಪಾರ್ಕ್", "तार", "करंट", "स्पार्क"],
    "collapse": ["collapse", "collapsed", "ಕುಸಿ", "गिर"],
    "medical": ["heart attack", "chest pain", "stroke", "ದಿಲ का दौरा", "छाती"],
    "danger": ["danger to life", "immediate danger", "life threat", "ಜೀವಕ್ಕೆ ಅಪಾಯ", "जान को खतरा"],
}


class EmergencyDetectionService:
    def detect(self, text: str) -> EmergencyMatch:
        folded = fold_for_match(text)

        for pat in _STRONG_PATTERNS:
            if pat in folded:
                return EmergencyMatch(True, pat, self._kind_of(pat))

        # contextual: needs a severity word in the same message
        has_context = any(p in folded for p in _CONTEXTUAL_PATTERNS)
        has_severity = any(s in folded for s in _SEVERITY_WORDS)
        if has_context and has_severity:
            matched = next((p for p in _CONTEXTUAL_PATTERNS if p in folded), None)
            return EmergencyMatch(True, matched, self._kind_of(matched or ""))

        return EmergencyMatch(False)

    @staticmethod
    def safety_signal(text: str) -> str | None:
        """Non-emergency safety concern (risk without immediate danger)."""
        folded = fold_for_match(text)
        for pat in SAFETY_PATTERNS:
            if pat in folded:
                return pat
        return None

    @staticmethod
    def _kind_of(pattern: str) -> str:
        for kind, needles in _KIND_MAP.items():
            if any(n in pattern for n in needles):
                return kind
        return "danger"


emergency_detection_service = EmergencyDetectionService()
