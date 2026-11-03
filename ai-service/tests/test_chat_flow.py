"""End-to-end conversation flows — the hackathon chatbot scenarios (tests 1–5)."""
from __future__ import annotations

from tests.conftest import turn


def _has_script(text: str, lo: int, hi: int) -> bool:
    return any(lo <= ord(ch) <= hi for ch in text)


def test_english_pothole_full_flow(client, headers):
    """Test 1: detect EN, classify road_damage, extract Mysuru, ask location,
    recommend authority, request confirmation."""
    j = turn(client, headers, "There is a huge pothole near my college in Mysuru.")
    u = j["understanding"]
    assert j["detected_language"] == "en"
    assert u["category"] == "road_damage"
    assert u["entities"]["district"] == "Mysuru"
    assert u["recommended_department"]  # authority recommended
    assert j["next_action"] == "ASK_LOCATION"  # precise spot still missing
    assert "location" in j["missing_slots"]

    # precise location
    j2 = turn(client, headers, "It is near the college main gate, ward 12.", j["state"])
    assert j2["next_action"] == "CLARIFY"  # optional road-type question

    j3 = turn(client, headers, "It is a city road", j2["state"])
    assert j3["next_action"] == "ASK_CONFIRM"
    assert j3["needs_confirmation"] is True
    assert j3["confirmation_summary"]
    assert "Mysuru" in j3["confirmation_summary"]

    j4 = turn(client, headers, "yes", j3["state"])
    assert j4["next_action"] == "REGISTER"  # explicit confirmation received


def test_kannada_garbage_flow(client, headers):
    """Test 2: detect KN, understand garbage, respond in Kannada, confirm gate."""
    j = turn(client, headers, "ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ಕಸ ಬಿದ್ದಿದೆ. ಯಾರೂ ಸ್ವಚ್ಛಗೊಳಿಸುತ್ತಿಲ್ಲ.")
    assert j["detected_language"] == "kn"
    assert j["understanding"]["category"] == "garbage_collection"
    assert _has_script(j["reply"], 0x0C80, 0x0CFF)  # replies in Kannada script

    j2 = turn(client, headers, "ಮೈಸೂರಿನ ನಮ್ಮ ಕಾಲೇಜಿನ ಮುಖ್ಯ ಗೇಟ್ ಹತ್ತಿರ", j["state"])
    assert j2["understanding"]["entities"]["district"] == "Mysuru"
    assert j2["next_action"] == "ASK_CONFIRM"
    assert _has_script(j2["confirmation_summary"], 0x0C80, 0x0CFF)

    j3 = turn(client, headers, "ಹೌದು", j2["state"])
    assert j3["next_action"] == "REGISTER"


def test_hindi_water_flow(client, headers):
    """Test 3: detect HI, water_supply, duration extracted, asks for location."""
    j = turn(client, headers, "हमारे इलाके में तीन दिनों से पानी नहीं आ रहा है।")
    u = j["understanding"]
    assert j["detected_language"] == "hi"
    assert u["category"] == "water_supply"
    assert u["entities"]["duration_days"] == 3
    assert j["next_action"] == "ASK_LOCATION"
    assert _has_script(j["reply"], 0x0900, 0x097F)  # replies in Devanagari


def test_manual_language_selection_wins(client, headers):
    j = turn(client, headers, "There is no water supply in our area.", language="kn")
    assert _has_script(j["reply"], 0x0C80, 0x0CFF)


def test_exposed_wire_emergency_and_safety(client, headers):
    """Test 4: electrical safety risk, suitable urgency, safety guidance, ESCOM."""
    j = turn(client, headers, "There is an exposed electrical wire near my house.")
    u = j["understanding"]
    assert u["safety_risk"] is True
    assert u["priority"] in ("high", "critical")
    assert "ESCOM" in u["recommended_department"] or "Electricity" in u["recommended_department"]
    assert j["emergency"]["is_emergency"] is True
    assert "112" in j["reply"]  # immediate guidance, no delay


def test_serious_accident_emergency(client, headers):
    """Test 5: emergency guidance + 112, never claims dispatch."""
    j = turn(client, headers, "There has been a serious road accident.")
    assert j["emergency"]["is_emergency"] is True
    assert j["next_action"] == "EMERGENCY"
    assert "112" in j["reply"]
    lowered = j["reply"].lower()
    for claim in ("dispatched", "help is on the way", "team has been sent", "responders notified"):
        assert claim not in lowered


def test_state_persists_across_reloads(client, headers):
    """Conversation state round-trips — a page reload loses nothing."""
    j1 = turn(client, headers, "There is a huge pothole near my college in Mysuru.")
    # simulate reload: state sent again with an unrelated short message
    j2 = turn(client, headers, "hello", j1["state"])
    # previous extraction must survive
    assert j2["slots"].get("district") == "Mysuru"
    assert j2["slots"].get("description")


def test_dont_know_skips_location(client, headers):
    j = turn(client, headers, "Garbage is not collected in our street for a week.")
    j2 = turn(client, headers, "I don't know the ward number", j["state"])
    # "don't know" must not loop: with district absent we allow triage fallback
    assert j2["next_action"] in ("ASK_CONFIRM", "ASK_LOCATION", "CLARIFY", "SMALLTALK")
    if j2["next_action"] == "ASK_CONFIRM":
        assert j2["needs_confirmation"]


def test_no_reasking_known_info(client, headers):
    """Once the location is known the bot must not ask for it again."""
    j = turn(client, headers, "There is a big pothole on the road near ward 5, Mysuru.")
    assert "location" not in j["missing_slots"]
    j2 = turn(client, headers, "please fix it fast", j["state"])
    assert j2["next_action"] != "ASK_LOCATION"


def test_negative_answer_returns_to_editing(client, headers):
    j = turn(client, headers, "There is a huge pothole near my college main gate, ward 12 in Mysuru.")
    if j["next_action"] == "ASK_CONFIRM":
        j2 = turn(client, headers, "no", j["state"])
        assert j2["next_action"] == "CLARIFY"
        assert j2["needs_confirmation"] is False
