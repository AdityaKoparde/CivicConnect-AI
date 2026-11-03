"""Reply templates — native (not machine-translated) Kannada, English and
Hindi text for every conversation action, plus confirmation summaries and
suggested replies. One question per turn; each template explains *why* the
information is needed.
"""
from __future__ import annotations

from app.schemas.ai import PriorityLiteral

# ---------------------------------------------------------------- actions ----
_TEMPLATES: dict[str, dict[str, str]] = {
    "greet": {
        "en": "Namaste! I'm the CivicConnect assistant. Tell me about the civic problem you're facing — what is happening and where. You can write in English, ಕನ್ನಡ or हिंदी.",
        "kn": "ನಮಸ್ತೆ! ನಾನು CivicConnect ಸಹಾಯಕ. ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ವಿವರವಾಗಿ ತಿಳಿಸಿ — ಏನಾಗುತ್ತಿದೆ ಮತ್ತು ಎಲ್ಲಿದೆ ಎಂದು. ನೀವು ಕನ್ನಡ, English ಅಥವा हिंदी ಯಾವುದಾದರೂ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಬಹುದು.",
        "hi": "नमस्ते! मैं CivicConnect सहायक हूँ। अपनी नागरिक समस्या विस्तार से बताइए — क्या हो रहा है और कहाँ है। आप हिंदी, English या ಕನ್ನಡ में भी लिख सकते हैं।",
    },
    "ask_description": {
        "en": "Could you describe the problem in a little more detail — what exactly is broken or not working, and where? That helps me route it to the right department.",
        "kn": "ದಯವಿಟ್ಟು ಸಮಸ್ಯೆಯನ್ನು ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ತಿಳಿಸಿ — ಏನು ಹಾಳಾಗಿದೆ ಅಥವಾ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ, ಮತ್ತು ನಿಖರವಾಗಿ ಎಲ್ಲಿದೆ? ಇದು ಸರಿಯಾದ ಇಲಾಖೆಗೆ ತಲುಪಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
        "hi": "कृपया समस्या थोड़ा और विस्तार से बताइए — ठीक क्या टूटा है या काम नहीं कर रहा, और बिल्कुल कहाँ है? इससे सही विभाग में शिकायत पहुँचाने में मदद मिलेगी।",
    },
    "ask_location": {
        "en": "I understand the problem. Please tell me the exact location — district, town, or a nearby landmark (school, bus stand, main road) so we can pinpoint the spot for the field team.",
        "kn": "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಸ್ಥಳವನ್ನು ತಿಳಿಸಿ — ಜಿಲ್ಲೆ, ಪಟ್ಟಣ ಅಥವಾ ಹತ್ತಿರದ ಗುರುತು (ಶಾಲೆ, ಬಸ್ ನಿಲ್ದಾಣ, ಮುಖ್ಯ ರಸ್ತೆ). ಸ್ಥಳವನ್ನು ನಿಖರವಾಗಿ ಗುರುತಿಸಲು ಇದು ಅಗತ್ಯ.",
        "hi": "आपकी समस्या समझ आ गई है। कृपया सटीक स्थान बताइए — जिला, शहर या पास का कोई प्रतीक (स्कूल, बस स्टैंड, मुख्य सड़क) ताकि टीम को सही जगह मिल सके।",
    },
    "ask_location_known_district": {
        "en": "I understand the problem{district_clause}. Please share a nearby landmark or the ward/street name so we can pinpoint the exact spot.",
        "kn": "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ{district_clause}. ದಯವಿಟ್ಟು ಹತ್ತಿರದ ಗುರುತು ಅಥವಾ ವಾರ್ಡ್/ರಸ್ತೆಯ ಹೆಸರು ತಿಳಿಸಿ — ಸ್ಥಳವನ್ನು ನಿಖರವಾಗಿ ಗುರುತಿಸಲು.",
        "hi": "आपकी समस्या समझ आ गई है{district_clause}। कृपया पास का प्रतीक या वार्ड/सड़क का नाम बताइए — सटीक जगह पहचानने के लिए।",
    },
    "ask_category": {
        "en": "I couldn't confidently tell which department this belongs to. Which of these is closest? (1) Roads & potholes (2) Water supply (3) Garbage (4) Electricity (5) Streetlights — or describe it in your own words.",
        "kn": "ಯಾವ ಇಲಾಖೆಗೆ ಸೇರಿದೆ ಎಂದು ನಿಖರವಾಗಿ ಗೊತ್ತಾಗಲಿಲ್ಲ. ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಹತ್ತಿರ? (1) ರಸ್ತೆ ಮತ್ತು ಗುಂಡಿಗಳು (2) ನೀರಿನ ಸರಬರಾಜು (3) ಕಸ ಸಂಗ್ರಹಣೆ (4) ವಿದ್ಯುತ್ (5) ಬೀದಿ ದೀಪ — ಅಥವಾ ನಿಮ್ಮ ಮಾತುಗಳಲ್ಲಿ ತಿಳಿಸಿ.",
        "hi": "मुझे ठीक से पता नहीं चला कि यह किस विभाग से संबंधित है। इनमें से सबसे करीब कौन-सा है? (1) सड़क और गड्ढे (2) पानी की आपूर्ति (3) कचरा (4) बिजली (5) स्ट्रीट लाइट — या अपने शब्दों में बताइए।",
    },
    "ask_road_type": {
        "en": "Is this a local city/municipal road or a state highway? If you're not sure, that's okay — we'll let the routing engine decide.",
        "kn": "ಇದು ಸ್ಥಳೀಯ ನಗರಸಭೆಯ ರಸ್ತೆ ಅಥವಾ ರಾಜ್ಯ ಹೆದ್ದಾರಿಯೇ? ನಿಮಗೆ ತಿಳಿದಿಲ್ಲದಿದ್ದರೂ ಪರವಾಗಿಲ್ಲ — ರೂಟಿಂಗ್ ಇಂಜಿನ್ ನಿರ್ಧರಿಸುತ್ತದೆ.",
        "hi": "क्या यह शहर/नगरपालिका की सड़क है या राज्य राजमार्ग? अगर आपको नहीं पता तो भी चलेगी — रूटिंग इंजन तय कर लेगा।",
    },
    "confirm": {
        "en": "Please review your complaint:\n• Problem: {summary}\n• Location: {location}\n• Category: {category}\n• Priority: {priority}\n• Attachments: {attachments}\nReply **yes** to register it, or **no** to make changes.",
        "kn": "ದಯವಿಟ್ಟು ದೂರಿನ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ:\n• ಸಮಸ್ಯೆ: {summary}\n• ಸ್ಥಳ: {location}\n• ವರ್ಗ: {category}\n• ಆದ್ಯತೆ: {priority}\n• ಲಗತ್ತುಗಳು: {attachments}\nನೋಂದಾಯಿಸಲು **ಹೌದು** ಎಂದು, ಬದಲಾಯಿಸಲು **ಇಲ್ಲ** ಎಂದು ಉತ್ತರಿಸಿ.",
        "hi": "कृपया शिकायत देखें:\n• समस्या: {summary}\n• स्थान: {location}\n• श्रेणी: {category}\n• प्राथमिकता: {priority}\n• अनुलग्नक: {attachments}\nदर्ज करने के लिए **हाँ**, बदलने के लिए **नहीं** लिखें।",
    },
    "confirm_safety_note": {
        "en": "\n⚠ Safety concern: keep people away from the hazard until authorities act. If anyone is hurt, call 112 first.",
        "kn": "\n⚠ ಸುರಕ್ಷತಾ ಆತಂಕ: ಅಧಿಕಾರಿಗಳು ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳುವವರೆಗೆ ಯಾರನ್ನೂ ಅಪಾಯದ ಹತ್ತಿರ ಬಿಡಬೇಡಿ. ಯಾರಾದರೂ ಗಾಯಗೊಂಡರೆ ಮೊದಲು 112 ಗೆ ಕರೆ ಮಾಡಿ.",
        "hi": "\n⚠ सुरक्षा चेतावनी: अधिकारियों के कदम उठाने तक लोगों को खतरे से दूर रखें। कोई घायल हो तो पहले 112 पर कॉल करें।",
    },
    "clarify": {
        "en": "Sorry, I didn't quite get that. Could you tell me more about the problem itself — what is broken, and where?",
        "kn": "ಕ್ಷಮಿಸಿ, ಸರಿಯಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಸ್ವಲ್ಪ ಹೆಚ್ಚು ತಿಳಿಸಬಹುದೇ — ಏನು ಹಾಳಾಗಿದೆ, ಎಲ್ಲಿ?",
        "hi": "माफ़ कीजिए, समझ नहीं आया। क्या आप समस्ये के बारे में और बता सकते हैं — क्या टूटा है, और कहाँ?",
    },
    "smalltalk": {
        "en": "I'm here to help you file a civic complaint. Let's start with what the problem is — tell me what's happening and where.",
        "kn": "ನಾಗರಿಕ ದೂರು ದಾಖಲಿಸಲು ನಾನು ಇದ್ದೇನೆ. ಸಮಸ್ಯೆ ಏನೆಂದು ತಿಳಿಸಿದಿಂದ ಪ್ರಾರಂಭಿಸೋಣ — ಏನಾಗುತ್ತಿದೆ ಮತ್ತು ಎಲ್ಲಿ ಎಂದು ತಿಳಿಸಿ.",
        "hi": "मैं नागरिक शिकायत दर्ज करने में आपकी मदद के लिए यहाँ हूँ। शुरुआत यहीं से करते हैं कि समस्या क्या है — क्या हो रहा है और कहाँ है बताइए।",
    },
    "emergency": {
        "en": "⚠ EMERGENCY: This sounds like an immediate danger to life. Please call 112 RIGHT NOW for emergency help — do not wait for this complaint to be processed. Once you are safe, I can still register this issue for administrative review.",
        "kn": "⚠ ತುರ್ತು ಪರಿಸ್ಥಿತಿ: ಇದು ತಕ್ಷಣದ ಜೀವಕ್ಕೆ ಅಪಾಯದಂತೆ ಕಾಣುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಈಗಲೇ 112 ಗೆ ಕರೆ ಮಾಡಿ — ಈ ದೂರು ಪ್ರಕ್ರಿಯೆಯಾಗಲು ಕಾಯಬೇಡಿ. ನೀವು ಸುರಕ್ಷಿತರಾದ ನಂತರ, ಈ ಸಮಸ್ಯೆಯನ್ನು ಆಡಳಿತಾತ್ಮಕ ಪರಿಶೀಲನೆಗಾಗಿ ನೋಂದಾಯಿಸಬಹುದು.",
        "hi": "⚠ आपातकाल: यह तत्काल जीवन-खतरा लगता है। कृपया अभी 112 पर कॉल करें — इस शिकायत की प्रक्रिया का इंतज़ार न करें। सुरक्षित होने के बाद आप इस मुद्दे को प्रशासनिक समीक्षा के लिए दर्ज करवा सकते हैं।",
    },
    "safety_guidance": {
        "en": "Safety tip: keep people — especially children — away from the spot until help arrives.",
        "kn": "ಸುರಕ್ಷತಾ ಸಲಹೆ: ಸಹಾಯ ಬರುವವರೆಗೆ ಮಕ್ಕಳು ಸೇರಿದಂತೆ ಯಾರನ್ನೂ ಆ ಜಾಗದ ಹತ್ತಿರ ಬಿಡಬೇಡಿ.",
        "hi": "सुरक्षा सलाह: मदद आने तक बच्चों समेत किसी को भी उस जगह के पास न जाने दें।",
    },
    "dont_know_ok": {
        "en": "That's okay — we'll proceed with what we have and flag it for manual review if needed.",
        "kn": "ಪರವಾಗಿಲ್ಲ — ಇರುವ ಮಾಹಿತಿಯೊಂದಿಗೆ ಮುಂದುವರಿಸುತ್ತೇವೆ; ಅಗತ್ಯವಿದ್ದರೆ ಪ್ರಶ್ನಿಕರಣಕ್ಕೆ ಕಳುಹಿಸುತ್ತೇವೆ.",
        "hi": "कोई बात नहीं — जो जानकारी है उसी के साथ आगे बढ़ेंगे; ज़रूरत पड़ी तो मैन्युअल समीक्षा में भेज देंगे।",
    },
    "negative_ok": {
        "en": "No problem. What would you like to change? Just tell me the correction.",
        "kn": "ಸಮಸ್ಯೆ ಇಲ್ಲ. ಏನು ಬದಲಾಯಿಸಬೇಕು? ತಿದ್ದುಪಡಿಯನ್ನು ನೇರವಾಗಿ ತಿಳಿಸಿ.",
        "hi": "कोई बात नहीं। आप क्या बदलना चाहेंगे? सुधार सीधे बता दीजिए।",
    },
    "confirm_needed_again": {
        "en": "Please reply **yes** to register the complaint, or **no** to make changes.",
        "kn": "ದೂರು ನೋಂದಾಯಿಸಲು **ಹೌದು**, ಬದಲಾಯಿಸಲು **ಇಲ್ಲ** ಎಂದು ಉತ್ತರಿಸಿ.",
        "hi": "शिकायत दर्ज करने के लिए **हाँ**, बदलने के लिए **नहीं** लिखें।",
    },
    "register_ack": {
        "en": "Thank you — registering your complaint now.",
        "kn": "ಧನ್ಯವಾದಗಳು — ಈಗ ನಿಮ್ಮ ದೂರನ್ನು ನೋಂದಾಯಿಸಲಾಗುತ್ತಿದೆ.",
        "hi": "धन्यवाद — अब आपकी शिकायत दर्ज की जा रही है।",
    },
    "location_unknown_ok": {
        "en": "Okay, we'll register it without the exact spot and the triage desk will confirm the location.",
        "kn": "ಸರಿ, ನಿಖರ ಸ್ಥಳವಿಲ್ಲದೆ ನೋಂದಾಯಿಸುತ್ತೇವೆ; ಪ್ರಶ್ನಿಕರಣ ಕಚೇರಿ ಸ್ಥಳವನ್ನು ದೃಢೀಕರಿಸುತ್ದೆ.",
        "hi": "ठीक है, बिना सटीक जगह के दर्ज कर देंगे; ट्राइज डेस्क स्थान की पुष्टि कर लेगा।",
    },
}

_DISTRICT_CLAUSE = {
    "en": " in {district} district",
    "kn": " ({district} ಜಿಲ್ಲೆಯಲ್ಲಿ)",
    "hi": " ({district} जिले में)",
}

_PRIORITY_LABELS: dict[PriorityLiteral, dict[str, str]] = {
    "low": {"en": "Low", "kn": "ಕಡಿಮೆ", "hi": "कम"},
    "medium": {"en": "Medium", "kn": "ಮಧ್ಯಮ", "hi": "मध्यम"},
    "high": {"en": "High", "kn": "ಹೆಚ್ಚು", "hi": "उच्च"},
    "critical": {"en": "Critical", "kn": "ತೀವ್ರ", "hi": "गंभीर"},
}

_SUGGESTED: dict[str, dict[str, list[str]]] = {
    "greet": {
        "en": ["There is a big pothole on our road", "No water supply since 3 days", "Garbage is not collected"],
        "kn": ["ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ", "ಮೂರು ದಿನದಿಂದ ನೀರು ಇಲ್ಲ", "ಕಸ ಸಂಗ್ರಹಣೆ ಆಗುತ್ತಿಲ್ಲ"],
        "hi": ["हमारी सड़क में बड़ा गड्ढा है", "तीन दिन से पानी नहीं", "कचरा नहीं उठाया जा रहा"],
    },
    "ask_location": {
        "en": ["Near the main bus stand", "Opposite government school", "Ward 12, near the market"],
        "kn": ["ಮುಖ್ಯ ಬಸ್ ನಿಲ್ದಾಣ ಹತ್ತಿರ", "ಸರ್ಕಾರಿ ಶಾಲೆ ಎದುರು", "ವಾರ್ಡ್ 12, ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ"],
        "hi": ["मुख्य बस स्टैंड के पास", "सरकारी स्कूल के सामने", "वार्ड 12, बाज़ार के पास"],
    },
    "ask_category": {
        "en": ["Roads and potholes", "Water supply", "Garbage collection"],
        "kn": ["ರಸ್ತೆ ಮತ್ತು ಗುಂಡಿಗಳು", "ನೀರಿನ ಸರಬರಾಜು", "ಕಸ ಸಂಗ್ರಹಣೆ"],
        "hi": ["सड़क और गड्ढे", "पानी की आपूर्ति", "कचरा संग्रहण"],
    },
    "ask_road_type": {
        "en": ["City/municipal road", "State highway", "Not sure"],
        "kn": ["ನಗರಸಭೆಯ ರಸ್ತೆ", "ರಾಜ್ಯ ಹೆದ್ದಾರಿ", "ಗೊತ್ತಿಲ್ಲ"],
        "hi": ["शहर/नगरपालिका की सड़क", "राज्य राजमार्ग", "पता नहीं"],
    },
    "ask_description": {
        "en": ["The road is broken near my house", "Water is leaking from the pipe", "Street light not working at night"],
        "kn": ["ನನ್ನ ಮನೆ ಹತ್ತಿರ ರಸ್ತೆ ಹಾಳಾಗಿದೆ", "ಪೈಪ್‌ನಿಂದ ನೀರು ಒಸರುತ್ತಿದೆ", "ರಾತ್ರಿ ಬೀದಿ ದೀಪ ಉರಿಯುತ್ತಿಲ್ಲ"],
        "hi": ["मेरे घर के पास सड़क टूटी है", "पाइप से पानी रिस रहा है", "रात में स्ट्रीट लाइट नहीं जलती"],
    },
    "confirm": {
        "en": ["Yes", "No"],
        "kn": ["ಹೌದು", "ಇಲ್ಲ"],
        "hi": ["हाँ", "नहीं"],
    },
    "default": {
        "en": ["Yes", "No", "I don't know"],
        "kn": ["ಹೌದು", "ಇಲ್ಲ", "ಗೊತ್ತಿಲ್ಲ"],
        "hi": ["हाँ", "नहीं", "पता नहीं"],
    },
}


def render(action: str, lang: str, **ctx: str) -> str:
    """Render a template action in the given language with safe substitution."""
    tpl = _TEMPLATES.get(action, _TEMPLATES["clarify"])
    text = tpl.get(lang) or tpl["en"]
    try:
        return text.format(**ctx)
    except (KeyError, IndexError):
        # Never crash the conversation over a template bug
        return text


def district_clause(district: str | None, lang: str) -> str:
    if not district:
        return ""
    return _DISTRICT_CLAUSE[lang].format(district=district)


def priority_label(priority: str, lang: str) -> str:
    labels = _PRIORITY_LABELS.get(priority.lower(), _PRIORITY_LABELS["medium"])  # type: ignore[index]
    return labels.get(lang) or labels["en"]


def suggested(action: str, lang: str) -> list[str]:
    table = _SUGGESTED.get(action, _SUGGESTED["default"])
    return table.get(lang) or table["en"]


def build_location_string(slots: dict, lang: str) -> str:
    """Human-readable location from whatever slots exist."""
    parts: list[str] = []
    for key in ("landmark", "ward", "city", "taluk"):
        val = slots.get(key)
        if val:
            # avoid "Mysuru, Mysuru" when taluk == city
            if key == "taluk" and val in (slots.get("city"), slots.get("district")):
                continue
            parts.append(str(val))
    district = slots.get("district")
    if district and district != slots.get("city"):
        suffix = {"en": "district", "kn": "ಜಿಲ್ಲೆ", "hi": "जिला"}.get(lang, "district")
        parts.append(f"{district} {suffix}")
    if slots.get("location_unknown") or not parts:
        return {"en": "Not specified (triage will confirm)", "kn": "ನಿರ್ದಿಷ್ಟವಾಗಿಲ್ಲ (ಪ್ರಶ್ನಿಕರಣ ದೃಢೀಕರಿಸುತ್ತದೆ)",
                "hi": "निर्दिष्ट नहीं (ट्राइज़ पुष्टि करेगा)"}.get(lang, "Not specified")
    return ", ".join(parts)


def build_attachments_string(slots: dict, lang: str) -> str:
    atts = slots.get("attachments") or []
    count = len(atts) if isinstance(atts, list) else 0
    if count == 0:
        return {"en": "None", "kn": "ಇಲ್ಲ", "hi": "नहीं"}[lang]
    noun = {"en": "image(s)", "kn": "ಚಿತ್ರ(ಗಳು)", "hi": "छवि"}[lang]
    return f"{count} {noun}"


def build_confirmation_summary(lang: str, slots: dict, understanding: dict | None) -> str:
    """Short native-language summary shown before explicit confirmation."""
    summary = str(slots.get("summary") or slots.get("description") or "")[:180]
    location = build_location_string(slots, lang)
    category_key = str(slots.get("category") or (understanding or {}).get("category") or "other")
    from app.services.lexicons import CATEGORY_LABELS

    cat = CATEGORY_LABELS.get(category_key, CATEGORY_LABELS["other"]).get(lang, category_key)
    priority = str(slots.get("priority") or (understanding or {}).get("priority") or "medium")
    prio = priority_label(priority, lang)
    attachments = build_attachments_string(slots, lang)
    lines = {
        "en": f"Problem: {summary}\nLocation: {location}\nCategory: {cat}\nPriority: {prio}\nAttachments: {attachments}",
        "kn": f"ಸಮಸ್ಯೆ: {summary}\nಸ್ಥಳ: {location}\nವರ್ಗ: {cat}\nಆದ್ಯತೆ: {prio}\nಲಗತ್ತುಗಳು: {attachments}",
        "hi": f"समस्या: {summary}\nस्थान: {location}\nश्रेणी: {cat}\nप्राथमिकता: {prio}\nअनुलग्नक: {attachments}",
    }
    return lines.get(lang, lines["en"])
