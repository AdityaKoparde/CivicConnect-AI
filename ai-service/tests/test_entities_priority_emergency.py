"""Entity extraction, priority assessment and emergency detection (spec 4–5)."""
from __future__ import annotations

from app.services.emergency import emergency_detection_service
from app.services.entity_extraction import entity_extraction_service
from app.services.priority import priority_assessment_service


def test_extract_district_and_landmark_english():
    e = entity_extraction_service.extract("There is a huge pothole near my college in Mysuru.")
    assert e.district == "Mysuru"
    assert e.landmark is not None


def test_extract_kannada_morphology():
    # "ಮೈಸೂರಿನ" (Mysuru-in) must still resolve to Mysuru district
    e = entity_extraction_service.extract("ಮೈಸೂರಿನ ನಮ್ಮ ಕಾಲೇಜಿನ ಮುಖ್ಯ ಗೇಟ್ ಹತ್ತಿರ.")
    assert e.district == "Mysuru"
    assert e.landmark is not None


def test_extract_duration_hindi():
    e = entity_extraction_service.extract("हमारे इलाके में तीन दिनों से पानी नहीं आ रहा है।")
    assert e.duration_days == 3


def test_extract_ward_and_road_type():
    e = entity_extraction_service.extract(
        "Pothole on the state highway near ward 12 in Bengaluru."
    )
    assert e.ward == "Ward 12"
    assert e.road_type == "highway"
    assert e.city == "Bengaluru"


def test_priority_not_everything_high():
    routine = priority_assessment_service.assess(
        "Garbage is not collected for a week in our street.",
        category="garbage_collection",
    )
    assert routine.priority in ("low", "medium")


def test_priority_exposed_wire_is_high_or_critical():
    text = "There is an exposed electrical wire near my house."
    em = emergency_detection_service.detect(text)
    assert em.is_emergency is True  # spec §13: dangerous exposed wire = emergency
    p = priority_assessment_service.assess(text, safety_risk=True, category="electricity",
                                           is_emergency=em.is_emergency)
    assert p.priority in ("high", "critical")


def test_priority_duration_and_scope_raise_urgency():
    text = "The whole area has had no drinking water for 30 days."
    entities = entity_extraction_service.extract(text)
    assert entities.duration_days == 30
    p = priority_assessment_service.assess(
        text, entities, category="water_supply"
    )
    assert p.score > 0.3
    assert any("duration" in f for f in p.factors)


def test_emergency_road_accident():
    em = emergency_detection_service.detect("There has been a serious road accident.")
    assert em.is_emergency is True
    assert em.kind in ("accident", "injury", "danger")


def test_non_emergency_not_flagged():
    em = emergency_detection_service.detect(
        "Speed breaker is missing at the accident spot near the school."
    )
    assert em.is_emergency is False  # "accident spot" without severity context


def test_emergency_kannada_fire():
    em = emergency_detection_service.detect("ಅಂಗಡಿಯಲ್ಲಿ ಬೆಂಕಿ ಹೊತ್ತಿಕೊಂಡಿದೆ.")
    assert em.is_emergency is True
