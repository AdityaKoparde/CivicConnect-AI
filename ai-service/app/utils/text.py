"""Text normalisation and Unicode-script helpers (no external model downloads)."""
from __future__ import annotations

import re
import unicodedata

# Unicode script blocks for the three primary supported languages
KANNADA_START, KANNADA_END = 0x0C80, 0x0CFF
DEVANAGARI_START, DEVANAGARI_END = 0x0900, 0x097F
LATIN_START, LATIN_END = 0x0041, 0x024F

_WS_RE = re.compile(r"\s+")


def normalize_text(text: str) -> str:
    """Unicode NFC, collapsed whitespace, trimmed. Original casing preserved."""
    text = unicodedata.normalize("NFC", text or "")
    text = _WS_RE.sub(" ", text)
    return text.strip()


def fold_for_match(text: str) -> str:
    """Lowercased matching form.

    Drops punctuation/symbols but PRESERVES combining marks (matras, virama)
    — Kannada/Hindi letters are built from base+mark sequences and stripping
    marks (as a naive [^\w\s] regex would) destroys the words entirely.
    """
    t = normalize_text(text).lower()
    out: list[str] = []
    for ch in t:
        if ch.isspace():
            out.append(" ")
        elif unicodedata.category(ch)[0] in ("P", "S"):
            out.append(" ")  # punctuation/symbols become word separators
        else:
            out.append(ch)
    return _WS_RE.sub(" ", "".join(out)).strip()


def script_profile(text: str) -> dict[str, int]:
    """Count letters per script group: kn, hi (devanagari), latin, other."""
    counts = {"kn": 0, "hi": 0, "latin": 0, "other": 0}
    for ch in text:
        if not ch.isalpha():
            continue
        cp = ord(ch)
        if KANNADA_START <= cp <= KANNADA_END:
            counts["kn"] += 1
        elif DEVANAGARI_START <= cp <= DEVANAGARI_END:
            counts["hi"] += 1
        elif LATIN_START <= cp <= LATIN_END:
            counts["latin"] += 1
        else:
            counts["other"] += 1
    return counts


def count_script(text: str, script: str) -> int:
    return script_profile(text).get(script, 0)


def strip_accents_fallback(text: str) -> str:  # pragma: no cover - placeholder
    return text


def digits_or_words_to_int(token: str) -> int | None:
    """Convert a numeric token (digit or EN/HI/KN word) to int."""
    if token.isdigit():
        return int(token)
    word_maps = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
        "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
        "a": 1, "an": 1,
        "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5, "ಆರು": 6,
        "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9, "ಹತ್ತು": 10,
        "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5,
        "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    }
    return word_maps.get(token.lower())


def contains_any(haystack: str, needles: list[str]) -> str | None:
    """Return the first matching needle (longest-first matching done by caller order)."""
    for n in needles:
        if n and n in haystack:
            return n
    return None


def clip(text: str, limit: int = 500) -> str:
    text = normalize_text(text)
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"
