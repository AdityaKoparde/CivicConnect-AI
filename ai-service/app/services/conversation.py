"""AIConversationService — the turn-by-turn conversation brain.

Maintains slot state (supplied by Node.js), extracts new information from
each message, decides the single next useful question, handles the explicit
confirmation gate, and never re-asks information it already has.

Rules honoured from the spec:
  * one question at a time
  * explain why missing information is required
  * allow corrections; don't force every field (explicit "don't know" skips)
  * emergency guidance first, never delaying help, never claiming dispatch
  * explicit confirmation is required before registration (next_action=REGISTER)
"""
from __future__ import annotations

import logging
import re

from app.schemas.ai import (
    AIUnderstanding,
    ChatRequest,
    ChatResponse,
    ConversationState,
    EmergencyInfo,
    Entities,
)
from app.services.language_detection import detect_language, resolve_reply_language
from app.services.replies import (
    build_confirmation_summary,
    district_clause,
    priority_label,
    render,
    suggested,
)
from app.services.understanding import understanding_service
from app.utils.text import fold_for_match, normalize_text

logger = logging.getLogger("civicconnect.ai.conversation")

# Landmark modifiers that make a location "specific enough" to stop asking
_SPECIFIC_MARKERS: list[str] = [
    "gate", "main", "cross", "junction", "circle", "chowk", "signal",
    "bridge", "bus stand", "bus stop", "station", "layout", "colony",
    "ward", "near opp", "opposite", "behind", "next to",
    "ಗೇಟ್", "ಮುಖ್ಯ", "ಕ್ರಾಸ್", "ಸಿಗ್ನಲ್", "ನಿಲ್ದಾಣ", "ಹಿಂದೆ", "ಎದುರು",
    "गेट", "मुख्य", "सिग्नल", "स्टैंड", "सामने", "पीछे",
]

_PRIORITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def _match_fold(text: str) -> str:
    """Lowercased fold that keeps 'dont' style words intact (drops apostrophes)."""
    t = normalize_text(text).lower()
    t = t.replace("'", "").replace("’", "")
    t = re.sub(r"[^\w\s\u0C80-\u0CFF\u0900-\u097F]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _contains(folded: str, patterns: list[str]) -> str | None:
    for pat in sorted(patterns, key=len, reverse=True):
        if not pat:
            continue
        if pat.isascii():
            if re.search(rf"\b{re.escape(pat)}\b", folded):
                return pat
        elif pat in folded:
            return pat
    return None


class AIConversationService:
    """Stateless per-call service: all state arrives in ChatRequest.state."""

    async def chat(self, req: ChatRequest) -> ChatResponse:
        state = req.state
        slots: dict = dict(state.slots)
        msg = normalize_text(req.message)
        folded = _match_fold(msg)
        turn = state.turn + 1

        detected = detect_language(msg)
        lang = resolve_reply_language(detected.language, req.language)

        # ---- 1. understand this message (cloud if configured, else demo) ----
        und = await understanding_service.understand_with_cloud(msg, lang)
        und = self._merge_understanding(state.understanding, und)

        # ---- 2. merge extracted information into slots ----
        self._merge_entities(slots, und.entities)
        if und.category != "other":
            slots["category"] = und.category
        elif "category" not in slots:
            slots["category"] = None  # unknown for now
        slots["summary"] = und.normalized_description
        if _PRIORITY_RANK[und.priority] >= _PRIORITY_RANK.get(str(slots.get("priority", "low")), 0):
            slots["priority"] = und.priority

        # description: first substantive message wins
        substantive = self._is_substantive(msg, folded)
        if substantive and not slots.get("description"):
            slots["description"] = msg[:1000]

        # Node-provided device location label can serve as a landmark
        loc = slots.get("location")
        if isinstance(loc, dict) and loc.get("label") and not slots.get("landmark"):
            slots["landmark"] = str(loc["label"])[:120]

        # ---- 3. explicit "don't know" skips a missing field ----
        dont_know = _contains(folded, _DONT_KNOW) is not None
        if dont_know and not state.awaitingConfirmation:
            if not self._location_complete(slots):
                slots["location_unknown"] = True
            if not slots.get("category"):
                slots["category"] = "other"
                und.requires_manual_review = True
            if not slots.get("road_type") and slots.get("category") == "road_damage":
                slots["road_type"] = "unknown"

        # ---- 4. emergency detection (guidance first, never a delay claim) ----
        emergency_now = bool(und.emergency)
        emergency_fresh = emergency_now and not state.emergencyHandled
        if emergency_fresh:
            slots["emergency"] = True

        # ---- 5. confirmation gate ----
        if state.awaitingConfirmation:
            return await self._confirmation_turn(req, state, slots, und, lang, folded, detected, msg)

        # ---- 6. decide the single next question ----
        next_action, reply_action, missing = self._decide(
            slots, state, turn, folded, substantive
        )

        # location-unknown fallback after two unanswered asks
        if "location" in missing and state.askedLocationTimes >= 2 and not self._location_complete(slots):
            slots["location_unknown"] = True
            missing = [m for m in missing if m != "location"]

        # category fallback after one unanswered ask
        if "category" in missing and state.askedCategories and not slots.get("category"):
            slots["category"] = "other"
            und.requires_manual_review = True
            missing = [m for m in missing if m != "category"]

        # recompute after fallbacks — may now be complete
        if (
            not missing
            and next_action == "ASK_CONFIRM"
            and not state.awaitingConfirmation
        ):
            return await self._confirm_ready_turn(
                req, state, slots, und, lang, detected, msg, emergency_fresh
            )

        # ---- 7. render the reply ----
        ctx = {
            "district_clause": district_clause(slots.get("district"), lang),
            "summary": str(slots.get("summary") or slots.get("description") or "")[:180],
        }
        reply = render(reply_action, lang, **ctx)
        if reply_action == "confirm":
            from app.services.replies import (
                build_attachments_string,
                build_location_string,
            )

            reply = render(
                "confirm",
                lang,
                summary=ctx["summary"],
                location=build_location_string(slots, lang),
                category=self._category_label(slots, lang),
                priority=priority_label(str(slots.get("priority", "medium")), lang),
                attachments=build_attachments_string(slots, lang),
            )
        if emergency_fresh:
            reply = render("emergency", lang) + "\n\n" + reply
        if und.safety_risk and not emergency_fresh:
            reply = reply + "\n" + render("safety_guidance", lang)

        # ---- 8. persist derived state ----
        new_state = self._next_state(
            state, slots, und, turn,
            asked_location=next_action == "ASK_LOCATION",
            asked_category=next_action == "ASK_CATEGORY",
            asked_road_type=(
                reply_action == "ask_road_type"
            ),
            emergency_fresh=emergency_fresh,
            awaiting=False,
        )

        underlying = reply_action if reply_action != "ask_road_type" else "ask_road_type"
        return ChatResponse(
            detected_language=detected.language,  # type: ignore[arg-type]
            language_confidence=detected.confidence,
            reply=reply,
            understanding=und,
            slots=new_state.slots,  # type: ignore[arg-type]
            state=new_state,
            missing_slots=missing,
            next_action="EMERGENCY" if emergency_fresh else next_action,  # type: ignore[arg-type]
            needs_confirmation=False,
            confirmation_summary=None,
            emergency=EmergencyInfo(
                is_emergency=emergency_now,
                guidance=render("emergency", lang) if emergency_now else None,
                call_number="112",
            ),
            suggested_replies=suggested(underlying if not emergency_fresh else "ask_location", lang),
            ai_provider=und.ai_provider,
        )

    # ------------------------------------------------------------ internals ---
    async def _confirm_ready_turn(
        self, req, state, slots, und, lang, detected, msg, emergency_fresh
    ) -> ChatResponse:
        """All essential slots filled → show summary and ask for confirmation."""
        from app.services.replies import build_attachments_string, build_location_string

        summary = build_confirmation_summary(
            lang, slots, und.model_dump() if und else None
        )
        reply = render(
            "confirm",
            lang,
            summary=str(slots.get("summary") or slots.get("description") or "")[:180],
            location=build_location_string(slots, lang),
            category=self._category_label(slots, lang),
            priority=priority_label(str(slots.get("priority", "medium")), lang),
            attachments=build_attachments_string(slots, lang),
        )
        if und.safety_risk:
            reply += render("confirm_safety_note", lang)
        if emergency_fresh:
            reply = render("emergency", lang) + "\n\n" + reply

        new_state = self._next_state(
            state, slots, und, state.turn + 1,
            asked_location=False, asked_category=False, asked_road_type=False,
            emergency_fresh=emergency_fresh, awaiting=True,
        )
        return ChatResponse(
            detected_language=detected.language,  # type: ignore[arg-type]
            language_confidence=detected.confidence,
            reply=reply,
            understanding=und,
            slots=new_state.slots,  # type: ignore[arg-type]
            state=new_state,
            missing_slots=[],
            next_action="ASK_CONFIRM",
            needs_confirmation=True,
            confirmation_summary=summary,
            emergency=EmergencyInfo(
                is_emergency=bool(und.emergency),
                guidance=render("emergency", lang) if und.emergency else None,
                call_number="112",
            ),
            suggested_replies=suggested("confirm", lang),
            ai_provider=und.ai_provider,
        )

    async def _confirmation_turn(
        self, req, state, slots, und, lang, folded, detected, msg
    ) -> ChatResponse:
        """Interpret the citizen's reply while the confirmation is pending."""
        from app.services.replies import build_attachments_string, build_location_string

        if _contains(folded, _AFFIRMATIVE):
            reply = render("register_ack", lang)
            new_state = self._next_state(
                state, slots, und, state.turn + 1,
                asked_location=False, asked_category=False, asked_road_type=False,
                emergency_fresh=False, awaiting=True,
            )
            return ChatResponse(
                detected_language=detected.language,  # type: ignore[arg-type]
                language_confidence=detected.confidence,
                reply=reply,
                understanding=und,
                slots=new_state.slots,  # type: ignore[arg-type]
            state=new_state,
                missing_slots=[],
                next_action="REGISTER",
                needs_confirmation=True,
                confirmation_summary=build_confirmation_summary(
                    lang, slots, und.model_dump()
                ),
                emergency=EmergencyInfo(is_emergency=bool(und.emergency), call_number="112"),
                suggested_replies=suggested("confirm", lang),
                ai_provider=und.ai_provider,
            )

        if _contains(folded, _NEGATIVE):
            new_state = self._next_state(
                state, slots, und, state.turn + 1,
                asked_location=False, asked_category=False, asked_road_type=False,
                emergency_fresh=False, awaiting=False,
            )
            return ChatResponse(
                detected_language=detected.language,  # type: ignore[arg-type]
                language_confidence=detected.confidence,
                reply=render("negative_ok", lang),
                understanding=und,
                slots=new_state.slots,  # type: ignore[arg-type]
            state=new_state,
                missing_slots=[],
                next_action="CLARIFY",
                needs_confirmation=False,
                confirmation_summary=None,
                emergency=EmergencyInfo(is_emergency=bool(und.emergency), call_number="112"),
                suggested_replies=suggested("ask_description", lang),
                ai_provider=und.ai_provider,
            )

        if _contains(folded, _DONT_KNOW):
            # "don't know" at the confirm gate = keep details, re-confirm
            new_state = self._next_state(
                state, slots, und, state.turn + 1,
                asked_location=False, asked_category=False, asked_road_type=False,
                emergency_fresh=False, awaiting=True,
            )
            summary = build_confirmation_summary(lang, slots, und.model_dump())
            return ChatResponse(
                detected_language=detected.language,  # type: ignore[arg-type]
                language_confidence=detected.confidence,
                reply=render("confirm_needed_again", lang),
                understanding=und,
                slots=new_state.slots,  # type: ignore[arg-type]
            state=new_state,
                missing_slots=[],
                next_action="ASK_CONFIRM",
                needs_confirmation=True,
                confirmation_summary=summary,
                emergency=EmergencyInfo(is_emergency=bool(und.emergency), call_number="112"),
                suggested_replies=suggested("confirm", lang),
                ai_provider=und.ai_provider,
            )

        # Not an explicit yes/no → treat as a correction and re-evaluate
        next_action, reply_action, missing = self._decide(
            slots, state, state.turn + 1, folded, True
        )
        if not missing and next_action == "ASK_CONFIRM":
            return await self._confirm_ready_turn(
                req, state, slots, und, lang, detected, msg, False
            )
        ctx = {"district_clause": district_clause(slots.get("district"), lang)}
        reply = render(reply_action, lang, **ctx)
        new_state = self._next_state(
            state, slots, und, state.turn + 1,
            asked_location=next_action == "ASK_LOCATION",
            asked_category=next_action == "ASK_CATEGORY",
            asked_road_type=reply_action == "ask_road_type",
            emergency_fresh=False, awaiting=False,
        )
        return ChatResponse(
            detected_language=detected.language,  # type: ignore[arg-type]
            language_confidence=detected.confidence,
            reply=reply,
            understanding=und,
            slots=new_state.slots,  # type: ignore[arg-type]
            state=new_state,
            missing_slots=missing,
            next_action=next_action,  # type: ignore[arg-type]
            needs_confirmation=False,
            confirmation_summary=None,
            emergency=EmergencyInfo(is_emergency=bool(und.emergency), call_number="112"),
            suggested_replies=suggested(
                "ask_location" if next_action == "ASK_LOCATION" else "ask_description", lang
            ),
            ai_provider=und.ai_provider,
        )

    def _decide(self, slots, state, turn, folded, substantive):
        """Return (next_action, reply_action, missing) — one question at a time."""
        missing: list[str] = []
        if not slots.get("description"):
            missing.append("description")
        if not self._location_complete(slots):
            missing.append("location")
        if not slots.get("category"):
            missing.append("category")

        if "description" in missing:
            if turn <= 1 and not substantive and _contains(folded, _GREETING):
                return "SMALLTALK", "greet", missing
            return "CLARIFY", "ask_description", missing

        if "location" in missing:
            if slots.get("district") or slots.get("city"):
                # district known → ask for the precise spot once
                if not state.askedLocationTimes:
                    return "ASK_LOCATION", "ask_location_known_district", missing
                return "ASK_LOCATION", "ask_location", missing
            return "ASK_LOCATION", "ask_location", missing

        if "category" in missing:
            if not state.askedCategories:
                return "ASK_CATEGORY", "ask_category", missing
            # asked already; caller applies the "other" fallback

        # optional road-type clarification for routing accuracy (once)
        if (
            slots.get("category") == "road_damage"
            and not slots.get("road_type")
            and not state.askedRoadType
        ):
            return "CLARIFY", "ask_road_type", missing

        # everything essential present → confirmation handled by caller
        return "ASK_CONFIRM", "confirm", missing

    @staticmethod
    def _location_complete(slots: dict) -> bool:
        if slots.get("location_unknown"):
            return True
        has_place = bool(slots.get("district") or slots.get("city") or slots.get("taluk"))
        if not has_place:
            return False
        if slots.get("ward"):
            return True
        landmark = str(slots.get("landmark") or "")
        if not landmark:
            # a labelled device location counts
            loc = slots.get("location")
            return bool(isinstance(loc, dict) and loc.get("label"))
        # generic landmark ("college") still needs one precise detail
        return _contains(_match_fold(landmark), _SPECIFIC_MARKERS) is not None or _contains(
            _match_fold(str(slots.get("description") or "")), _SPECIFIC_MARKERS
        ) is not None

    @staticmethod
    def _is_substantive(msg: str, folded: str) -> bool:
        if len(msg) < 8:
            return False
        tokens = [t for t in folded.split() if t]
        if not tokens:
            return False
        from app.services.lexicons import GREETING_WORDS

        greet_set = {g.replace("'", "") for g in GREETING_WORDS}
        return not all(t in greet_set for t in tokens)

    @staticmethod
    def _merge_understanding(prev: AIUnderstanding | None, curr: AIUnderstanding) -> AIUnderstanding:
        if prev is None:
            return curr
        if curr.category == "other" and prev.category != "other":
            # unclassifiable follow-up: keep the previous category…
            merged = prev.model_copy(deep=True)
        elif curr.category == prev.category:
            merged = curr.model_copy(deep=True)
            merged.original_text = prev.original_text or curr.original_text
            merged.confidence = max(prev.confidence, curr.confidence)
        else:
            # A different category counts as a user correction only with strong
            # evidence — a weak follow-up classification (e.g. an ML-only guess
            # on a short location message) must not override the established
            # complaint category.
            strong = curr.confidence >= 0.75 or (
                curr.classification_method.startswith("rules")
                and curr.confidence >= 0.65
            )
            merged = curr.model_copy(deep=True) if strong else prev.model_copy(deep=True)
        # …but entities from the NEW message always get first refusal:
        # current non-null values override, previous values survive otherwise.
        prev_e, curr_e = prev.entities, curr.entities
        data: dict = {}
        for field in Entities.model_fields:
            cv = getattr(curr_e, field, None)
            pv = getattr(prev_e, field, None)
            data[field] = cv if cv is not None else pv
        merged.entities = Entities(**data)
        merged.emergency = prev.emergency or curr.emergency
        merged.safety_risk = prev.safety_risk or curr.safety_risk
        if _PRIORITY_RANK[prev.priority] > _PRIORITY_RANK[merged.priority]:
            merged.priority = prev.priority
        if prev.requires_manual_review:
            merged.requires_manual_review = True
        return merged

    @staticmethod
    def _merge_entities(slots: dict, entities: Entities) -> None:
        for key in (
            "district", "taluk", "city", "ward", "landmark", "local_body",
            "road_type", "problem_type", "safety_details",
        ):
            val = getattr(entities, key, None)
            if val:
                slots[key] = val
        if entities.duration_days is not None:
            slots["duration_days"] = entities.duration_days

    @staticmethod
    def _category_label(slots: dict, lang: str) -> str:
        from app.services.lexicons import CATEGORY_LABELS

        key = slots.get("category") or "other"
        return CATEGORY_LABELS.get(key, CATEGORY_LABELS["other"]).get(lang, key)

    @staticmethod
    def _next_state(
        state: ConversationState,
        slots: dict,
        und: AIUnderstanding,
        turn: int,
        *,
        asked_location: bool,
        asked_category: bool,
        asked_road_type: bool,
        emergency_fresh: bool,
        awaiting: bool,
    ) -> ConversationState:
        return ConversationState(
            slots=slots,
            missing=[],
            understanding=und,
            turn=turn,
            emergencyHandled=bool(state.emergencyHandled or emergency_fresh),
            awaitingConfirmation=awaiting,
            askedCategories=bool(state.askedCategories or asked_category),
            askedRoadType=bool(state.askedRoadType or asked_road_type),
            askedLocationTimes=state.askedLocationTimes + (1 if asked_location else 0),
        )


from app.services.lexicons import GREETING_WORDS as _GREETING  # noqa: E402
from app.services.lexicons import (  # noqa: E402
    AFFIRMATIVE as _AFFIRMATIVE,
    DONT_KNOW as _DONT_KNOW,
    NEGATIVE as _NEGATIVE,
)

conversation_service = AIConversationService()
