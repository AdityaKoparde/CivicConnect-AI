"""Language detection + grievance classification (spec tests 1–3 building blocks)."""
from __future__ import annotations

from app.services.classification import classification_service
from app.services.language_detection import detect_language


def test_detect_kannada():
    r = detect_language("ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ಕಸ ಬಿದ್ದಿದೆ.")
    assert r.language == "kn"
    assert r.confidence >= 0.8 and r.supported


def test_detect_hindi():
    r = detect_language("हमारे इलाके में पानी नहीं आ रहा है।")
    assert r.language == "hi"
    assert r.confidence >= 0.8 and r.supported


def test_detect_english():
    r = detect_language("There is a huge pothole near my college.")
    assert r.language == "en"
    assert r.confidence >= 0.6 and r.supported


def test_detect_empty_or_digits():
    assert detect_language("123 !!!").language == "other"
    assert detect_language("").supported is False


def test_classifier_trained():
    classification_service.train()
    assert classification_service.trained


def test_classify_kannada_water_issue_phrasing():
    """"water problem in my area" — genitive ನೀರಿನ, not just ನೀರು ಬರುತ್ತಿಲ್ಲ."""
    classification_service.train()
    res = classification_service.classify("ನನ್ನ ಏರಿಯಾದಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ")
    assert res.category == "water_supply"
    assert res.confidence >= 0.6


def test_classify_english_pothole():
    res = classification_service.classify("There is a huge pothole near my college in Mysuru.")
    assert res.category == "road_damage"
    assert res.confidence >= 0.65


def test_classify_kannada_garbage():
    res = classification_service.classify(
        "ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ಕಸ ಬಿದ್ದಿದೆ. ಯಾರೂ ಸ್ವಚ್ಛಗೊಳಿಸುತ್ತಿಲ್ಲ."
    )
    assert res.category == "garbage_collection"
    assert res.confidence >= 0.65


def test_classify_hindi_water():
    res = classification_service.classify("हमारे इलाके में तीन दिनों से पानी नहीं आ रहा है।")
    assert res.category == "water_supply"
    assert res.confidence >= 0.65


def test_classify_electricity_and_streetlights():
    assert classification_service.classify(
        "No electricity in our area since last night."
    ).category == "electricity"
    assert classification_service.classify(
        "Street light in front of our house is not working."
    ).category == "streetlights"


def test_not_everything_is_high_confidence_other():
    # A vague message must land in 'other' with low confidence (manual review)
    res = classification_service.classify("asdf qwerty zxcv")
    assert res.category == "other"
    assert res.confidence < 0.65
