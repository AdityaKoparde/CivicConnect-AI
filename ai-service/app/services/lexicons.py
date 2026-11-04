"""Multilingual knowledge base: category lexicons, Karnataka gazetteers,
emergency/priority patterns, translation phrases and the labelled training
corpus used by the scikit-learn classifier.

All geographic names are public administrative facts (Karnataka districts and
well-known taluks). No official contact details or invented jurisdiction
records live here — department routing decisions belong to the backend.
"""
from __future__ import annotations

# ------------------------------------------------------------------ labels ----
CATEGORY_LABELS: dict[str, dict[str, str]] = {
    "road_damage": {"en": "Roads and Potholes", "kn": "ರಸ್ತೆ ಮತ್ತು ಗುಂಡಿಗಳು", "hi": "सड़क और गड्ढे"},
    "water_supply": {"en": "Water Supply", "kn": "ನೀರಿನ ಸರಬರಾಜು", "hi": "जल आपूर्ति"},
    "drainage_sewage": {"en": "Drainage and Sewage", "kn": "ಚರಂಡಿ ಮತ್ತು ಮಲಮೂತ್ರ", "hi": "नाली और मल-मूत्र"},
    "garbage_collection": {"en": "Garbage Collection", "kn": "ಕಸ ಸಂಗ್ರಹಣೆ", "hi": "कचरा संग्रहण"},
    "electricity": {"en": "Electricity", "kn": "ವಿದ್ಯುತ್", "hi": "बिजली"},
    "streetlights": {"en": "Streetlights", "kn": "ಬೀದಿ ದೀಪಗಳು", "hi": "स्ट्रीट लाइट"},
    "public_health": {"en": "Public Health", "kn": "ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ", "hi": "सार्वजनिक स्वास्थ्य"},
    "government_hospitals": {"en": "Government Hospitals", "kn": "ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗಳು", "hi": "सरकारी अस्पताल"},
    "public_transport": {"en": "Public Transport", "kn": "ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ", "hi": "सार्वजनिक परिवहन"},
    "road_safety": {"en": "Road Safety", "kn": "ರಸ್ತೆ ಸುರಕ್ಷತೆ", "hi": "सड़क सुरक्षा"},
    "environmental_pollution": {"en": "Environmental Pollution", "kn": "ಪರಿಸರ ಮಾಲಿನ್ಯ", "hi": "पर्यावरण प्रदूषण"},
    "public_infrastructure": {"en": "Public Infrastructure", "kn": "ಸಾರ್ವಜನಿಕ ಮೂಲಸೌಕರ್ಯ", "hi": "सार्वजनिक अवसंरचना"},
    "animal_welfare": {"en": "Animal Welfare", "kn": "ಪ್ರಾಣಿ ಸಂಕ್ಷೇಮ", "hi": "पशु कल्याण"},
    "fire_emergency": {"en": "Fire and Emergency", "kn": "ಬೆಂಕಿ ಮತ್ತು ತುರ್ತು ಸೇವೆ", "hi": "आग और आपातकाल"},
    "other": {"en": "Other Civic Issues", "kn": "ಇತರ ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳು", "hi": "अन्य नागरिक समस्याएँ"},
}

CATEGORIES = list(CATEGORY_LABELS.keys())

# --------------------------------------------------------------- keywords ----
# Longest keywords first matters: matching is substring based.
CATEGORY_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "road_damage": {
        "en": ["road damage", "broken road", "cracked road", "road collapsed", "sinkhole",
               "uneven road", "pothole", "potholes", "road is broken", "tar damaged"],
        "kn": ["ರಸ್ತೆ ಗುಂಡಿ", "ಹಾಳಾದ ರಸ್ತೆ", "ರಸ್ತೆ ಹಾಳು", "ರಸ್ತೆ ಕುಸಿದ", "ಟಾರ್ ಹಾಳು",
               "ಗುಂಡಿ", "ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿ"],
        "hi": ["सड़क खराब", "सड़क टूटी", "सड़क धंसी", "गड्ढों", "गड्ढा", "सड़क की मरम्मत"],
    },
    "water_supply": {
        "en": ["water supply", "no water", "water not coming", "drinking water",
               "pipe burst", "water shortage", "tap water", "water logging pipe"],
        "kn": ["ನೀರಿನ ಸರಬರಾಜು", "ಕುಡಿಯುವ ನೀರು", "ನೀರು ಬರುತ್ತಿಲ್ಲ", "ನೀರು ಇಲ್ಲ",
               "ಪೈಪ್ ಒಡೆದ", "ನೀರಿನ ಕೊರತೆ", "ನೀರಿನ", "ನೀರು ಸರಬರಾಜು", "ನೀರು ಸಮಸ್ಯೆ",
               "ನೀರಿನ ಸಮಸ್ಯೆ"],
        "hi": ["पानी नहीं आ", "जल आपूर्ति", "पानी की सप्लाई", "पीने का पानी",
               "पानी की कमी", "नल टूटा", "पानी नहीं"],
    },
    "drainage_sewage": {
        "en": ["drainage", "sewage", "clogged drain", "manhole", "overflowing drain",
               "stagnant water drain", "smell from drain", "drain water"],
        "kn": ["ಚರಂಡಿ", "ಮಲಮೂತ್ರ", "ಚರಂಡಿ ತುಂಬಿ", "ನೀರು ನಿಂತ", "ದುರ್ವಾಸನೆ"],
        "hi": ["नाली", "नाला", "गटर", "नाली जाम", "गंदगी", "बदबू", "नाली का पानी"],
    },
    "garbage_collection": {
        "en": ["garbage", "waste not collected", "trash", "litter", "no sweeping",
               "waste bin", "street cleanliness", "rubbish"],
        "kn": ["ಕಸ", "ಕಸ ಸಂಗ್ರಹಣೆ", "ಕಸ ಪಡೆಯುತ್ತಿಲ್ಲ", "ಸ್ವಚ್ಛಗೊಳಿಸುತ್ತಿಲ್ಲ", "ಕಸದ ಬುಟ್ಟಿ"],
        "hi": ["कचरा", "कूड़ा", "सफाई नहीं", "कचरा नहीं", "कचरे का डिब्बा", "गंदगी"],
    },
    "electricity": {
        "en": ["power cut", "no electricity", "electricity not", "power outage",
               "transformer", "voltage", "current not", "electricity problem"],
        "kn": ["ವಿದ್ಯುತ್ ಇಲ್ಲ", "ವಿದ್ಯುತ್ ಕಡಿತ", "ಟ್ರಾನ್ಸ್ಫಾರ್ಮರ್", "ವೋಲ್ಟೇಜ್",
               "ಕರೆಂಟ್ ಇಲ್ಲ", "ವಿದ್ಯುತ್"],
        "hi": ["बिजली नहीं", "बिजली कटौती", "ट्रांसफार्मर", "वोल्टेज", "बिजली गुल",
               "करंट नहीं", "बिजली"],
    },
    "streetlights": {
        "en": ["street light", "streetlight", "light not working", "lamp post",
               "no light at night", "lights not", "light pole"],
        "kn": ["ಬೀದಿ ದೀಪ", "ರಸ್ತೆ ದೀಪ", "ದೀಪ ಉರಿಯುತ್ತಿಲ್ಲ", "ಲೈಟ್ ಇಲ್ಲ",
               "ರಾತ್ರಿ ಕತ್ತಲು", "ಲೈಟ್ ಪೋಸ್ಟ್"],
        "hi": ["स्ट्रीट लाइट", "बत्ती नहीं", "लाइट खराब", "रात में अंधेरा",
               "लाइट का खंभा", "स्ट्रीट लाइट नहीं"],
    },
    "public_health": {
        "en": ["dengue", "malaria", "mosquito", "sanitation", "unhygienic",
               "contaminated", "stink", "disease", "health hazard"],
        "kn": ["ಡೆಂಗ್ಯೂ", "ಮಲೇರಿಯಾ", "ಸೊಳ್ಳೆ", "ಅನಾರೋಗ್ಯ", "ರೋಗ", "ಮಲಿನ"],
        "hi": ["डेंगू", "मलेरिया", "मच्छर", "बीमारी", "गंदगी", "स्वच्छता"],
    },
    "government_hospitals": {
        "en": ["government hospital", "health center", "health centre", "phc",
               "doctor not coming", "no medicine", "clinic", "hospital"],
        "kn": ["ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ", "ಆರೋಗ್ಯ ಕೇಂದ್ರ", "ವೈದ್ಯರು ಇಲ್ಲ", "औಷಧಿ ಇಲ್ಲ",
               "ಆಸ್ಪತ್ರೆ"],
        "hi": ["सरकारी अस्पताल", "स्वास्थ्य केंद्र", "डॉक्टर नहीं", "दवा नहीं",
               "अस्पताल", "PHC"],
    },
    "public_transport": {
        "en": ["bus service", "bus stop", "bus not", "ksrtc", "public transport",
               "train cancelled", "buses", "bus route"],
        "kn": ["ಬಸ್ ಸೇವೆ", "ಬಸ್ ನಿಲ್ದಾಣ", "ಬಸ್ ಸಂಚಾರ", "ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ",
               "ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ", "ರೈಲು", "ಬಸ್"],
        "hi": ["बस सेवा", "बस स्टैंड", "बस नहीं", "KSRTC", "सार्वजनिक परिवहन",
               "रेल", "बस"],
    },
    "road_safety": {
        "en": ["zebra crossing", "traffic signal", "signboard", "speed breaker",
               "crash guard", "accident spot", "road safety", "diverter"],
        "kn": ["ಸಿಗ್ನಲ್", "ಸೈನ್ ಬೋರ್ಡ್", "ಡಿವೈಡರ್", "ಅಪಘಾತ ಸ್ಥಳ",
               "ಸ್ಪೀಡ್ ಬ್ರೇಕರ್", "ರಸ್ತೆ ಸುರಕ್ಷತೆ"],
        "hi": ["सिग्नल", "साइन बोर्ड", "डिवाइडर", "स्पीड ब्रेकर",
               "ज़ेब्रा क्रॉसिंग", "सड़क सुरक्षा"],
    },
    "environmental_pollution": {
        "en": ["pollution", "factory smoke", "air pollution", "water pollution",
               "dust", "noise pollution", "smoke", "stink factory"],
        "kn": ["ಮಾಲಿನ್ಯ", "ವಾಯು ಮಾಲಿನ್ಯ", "ಧೂಳು", "ಶಬ್ದ ಮಾಲಿನ್ಯ", "ಹೊಗೆ",
               "ಕಲುಷಿತ"],
        "hi": ["प्रदूषण", "धुआं", "धूल", "शोर", "गंदा पानी", "कारखाने के धुएं"],
    },
    "public_infrastructure": {
        "en": ["footpath", "public toilet", "bus shelter", "railing", "public building",
               "footpath broken", "bridge", "public works"],
        "kn": ["ಫುಟ್‌ಪಾತ್", "ಸಾರ್ವಜನಿಕ ಶೌಚಾಲಯ", "ಬಸ್ ತಂಗುವ ಸ್ಥಳ", "ರೈಲಿಂಗ್",
               "ಸೇತುವೆ", "ಸಾರ್ವಜನಿಕ ಕಟ್ಟಡ"],
        "hi": ["फुटपाथ", "सार्वजनिक शौचालय", "बस शेल्टर", "रैलिंग", "पुल",
               "सार्वजनिक भवन"],
    },
    "animal_welfare": {
        "en": ["stray dog", "injured animal", "dead animal", "cattle on road",
               "monkey", "bull on road", "animal", "dogs chasing"],
        "kn": ["ಕಾಡು ನಾಯಿ", "ಮೃತ ಪ್ರಾಣಿ", "ಗಾಯಗೊಂಡ ಪ್ರಾಣಿ", "ದನ", "ಚಿರತೆ",
               "ಪ್ರಾಣಿ", "ನಾಯಿ"],
        "hi": ["आवारा कुत्ता", "मृत जानवर", "घायल जानवर", "गाय", "बंदर",
               "जानवर", "बैल"],
    },
    "fire_emergency": {
        "en": ["fire broke", "on fire", "burning", "fire station", "fire in",
               "flames", "house fire"],
        "kn": ["ಬೆಂಕಿ ಹೊತ್ತಿ", "ಬೆಂಕಿ ಕಾಣಿಸಿ", "ಅಗ್ನಿ", "ಬೆಂಕಿ", "ಹೊಗೆ"],
        "hi": ["आग लग", "आग", "अग्नि", "धुआं", "जल रहा"],
    },
    "other": {
        "en": ["civic problem", "public services", "complaint", "issue", "problem"],
        "kn": ["ಸಮಸ್ಯೆ", "ದೂರು", "ಸಾರ್ವಜನಿಕ ಸೇವೆ"],
        "hi": ["समस्या", "शिकायत", "सार्वजनिक सेवा"],
    },
}

# ------------------------------------------------------------- gazetteers ----
# All 31 districts of Karnataka (public administrative facts) + common aliases.
DISTRICTS: dict[str, list[str]] = {
    "Bagalkot": ["bagalkot", "ಬಾಗಲಕೋಟೆ", "बागलकोट"],
    "Ballari": ["ballari", "bellary", "ಬಳ್ಳಾರಿ", "बल्लारी"],
    "Belagavi": ["belagavi", "belgaum", "ಬೆಳಗಾವಿ", "बेलगावी"],
    "Bengaluru Rural": ["bengaluru rural", "bangalore rural", "ಬೆಂಗಳೂರು ಗ್ರಾಮೀಣ"],
    "Bengaluru Urban": ["bengaluru urban", "bangalore", "bengaluru", "ಬೆಂಗಳೂರು", "बेंगलुरु"],
    "Bidar": ["bidar", "ಬೀದರ್", "बीदर"],
    "Chamarajanagar": ["chamarajanagar", "ಚಾಮರಾಜನಗर"],
    "Chikkamagaluru": ["chikkamagaluru", "chikmagalur", "ಚಿಕ್ಕಮಗಳೂರು"],
    "Chitradurga": ["chitradurga", "ಚಿತ್ರದುರ್ಗ"],
    "Dakshina Kannada": ["dakshina kannada", "mangaluru", "mangalore", "ದಕ್ಷಿಣ ಕನ್ನಡ",
                         "ಮಂಗಳೂರು", "मंगलूर"],
    "Davanagere": ["davanagere", "ದಾವಣಗೆರೆ"],
    "Dharwad": ["dharwad", "hubballi", "hubli", "ಧಾರವಾಡ", "ಹುಬ್ಬಳ್ಳಿ", "हुब्बल्ली"],
    "Gadag": ["gadag", "ಗದಗ"],
    "Hassan": ["hassan", "ಹಾಸನ"],
    "Haveri": ["haveri", "ಹಾವೇರಿ"],
    "Kalaburagi": ["kalaburagi", "gulbarga", "ಕಲಬುರಗಿ", "कलबुर्गी"],
    "Kodagu": ["kodagu", "coorg", "ಕೊಡಗು"],
    "Kolar": ["kolar", "ಕೋಲಾರ"],
    "Koppal": ["koppal", "ಕೊಪ್ಪಳ"],
    "Mandya": ["mandya", "ಮಂಡ್ಯ"],
    "Mysuru": ["mysuru", "mysore", "ಮೈಸೂರು", "मैसूर"],
    "Raichur": ["raichur", "ರಾಯಚೂರು"],
    "Ramanagara": ["ramanagara", "ರಾಮನಗರ"],
    "Shivamogga": ["shivamogga", "shimoga", "ಶಿವಮೊಗ್ಗ"],
    "Tumakuru": ["tumakuru", "tumkur", "ತುಮಕೂರು", "तुमकुर"],
    "Udupi": ["udupi", "ಉಡುಪಿ"],
    "Uttara Kannada": ["uttara kannada", "karwar", "ಉತ್ತರ ಕನ್ನಡ"],
    "Vijayapura": ["vijayapura", "bijapur", "ವಿಜಯಪುರ"],
    "Vijayanagara": ["vijayanagara", "ವಿಜಯನಗರ"],
    "Yadgir": ["yadgir", "ಯಾದಗಿರಿ"],
    "Chikkaballapur": ["chikkaballapur", "ಚಿಕ್ಕಬಳ್ಳಾಪುರ"],
}

# Well-known taluks (subset; demonstration gazetteer — extendable via admin UI)
TALUKS: dict[str, list[str]] = {
    "Mysuru": ["mysuru", "hunsur", "nanjangud", "kr pete", "k.r.pete", "piriyapatna",
               "t. narasipur", "h.d. kote", "ಮೈಸೂರು", "ಹುಣಸೂರು", "ನಂಜನಗೂಡು"],
    "Bengaluru Urban": ["bengaluru north", "bengaluru south", "kengeri", "anekal",
                        "ಬೆಂಗಳೂರು ಉತ್ತರ", "ಬೆಂಗಳೂರು ದಕ್ಷಿಣ", "ಕೆಂಗೇರಿ", "ಅನೇಕಲ್"],
    "Dakshina Kannada": ["mangaluru", "puttur", "sullia", "bantwal", "moorbidre",
                         "ಮಂಗಳೂರು", "ಪುತ್ತೂರು", "ಸುಳ್ಯ", "ಬಂಟ್ವಾಳ"],
    "Belagavi": ["belagavi", "chikkodi", "gokak", "raibag", "athanagi", "mundgod",
                 "ಬೆಳಗಾವಿ", "ಚಿಕ್ಕೋಡಿ", "ಗೋಕಾಕ", "ರಾಯಬಾಗ"],
    "Kalaburagi": ["kalaburagi", "sedam", "aland", "jevargi", "chitapur",
                   "ಕಲಬುರಗಿ", "ಸೇಡಂ", "ಆಲಂದ", "ಜೇವರ್ಗಿ"],
    "Tumakuru": ["tumakuru", "koratagere", "sira", "pavagada", "ಗುಬ್ಬಿ"],
    "Mandya": ["mandya", "srirangapatna", "kr pete", "nagamangala", "ಮಂಡ್ಯ",
               "ಶ್ರೀರಂಗಪಟ್ಟಣ"],
}

CITIES: dict[str, list[str]] = {
    "Bengaluru": ["bengaluru", "bangalore", "ಬೆಂಗಳೂರು", "बेंगलुरु"],
    "Mysuru": ["mysuru", "mysore", "ಮೈಸೂರು", "मैसूर"],
    "Mangaluru": ["mangaluru", "mangalore", "ಮಂಗಳೂರು"],
    "Hubballi-Dharwad": ["hubballi-dharwad", "hubli-dharwad", "ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ"],
    "Belagavi": ["belagavi", "belgaum", "ಬೆಳಗಾವಿ"],
    "Kalaburagi": ["kalaburagi", "gulbarga", "ಕಲಬುರಗಿ"],
    "Ballari": ["ballari", "bellary", "ಬಳ್ಳಾರಿ"],
    "Tumakuru": ["tumakuru", "tumkur", "ತುಮಕೂರು"],
    "Shivamogga": ["shivamogga", "shimoga", "ಶಿವಮೊಗ್ಗ"],
    "Davanagere": ["davanagere", "ದಾವಣಗೆರೆ"],
    "Udupi": ["udupi", "ಉಡುಪಿ"],
    "Hassan": ["hassan", "ಹಾಸನ"],
    "Mandya": ["mandya", "ಮಂಡ್ಯ"],
    "Raichur": ["raichur", "ರಾಯಚೂರು"],
    "Bidar": ["bidar", "ಬೀದರ್"],
    "Kolar": ["kolar", "ಕೋಲಾರ"],
    "Chikkamagaluru": ["chikkamagaluru", "chikmagalur", "ಚಿಕ್ಕಮಗಳೂರು"],
    "Chitradurga": ["chitradurga", "ಚಿತ್ರದುರ್ಗ"],
}

LANDMARKS: list[str] = [
    # English
    "college", "school", "hospital", "bus stand", "bus stop", "railway station",
    "market", "main road", "playground", "park", "temple", "church", "mosque",
    "circle", "junction", "colony", "layout", "bridge", "lake", "gate",
    "main gate", "highway", "bus depot", "post office", "bank", "atm",
    # Kannada
    "ಕಾಲೇಜ್", "ಶಾಲೆ", "ಆಸ್ಪತ್ರೆ", "ಬಸ್ ನಿಲ್ದಾಣ", "ರೈಲ್ವೆ ನಿಲ್ದಾಣ", "ಮಾರುಕಟ್ಟೆ",
    "ಮುಖ್ಯ ರಸ್ತೆ", "ಆಟದ ಮೈದಾನ", "ಉದ್ಯಾನ", "ದೇವಸ್ಥಾನ", "ಕೆರೆ", "ಸೇತುವೆ",
    "ಗೇಟ್", "ಮುಖ್ಯ ಗೇಟ್", "ಬಸ್ ಡಿಪೋ",
    # Hindi
    "कॉलेज", "स्कूल", "अस्पताल", "बस स्टैंड", "रेलवे स्टेशन", "बाज़ार",
    "मुख्य सड़क", "मैदान", "पार्क", "मंदिर", "तालाब", "पुल", "गेट",
]

LOCAL_BODY_WORDS: list[str] = [
    "corporation", "municipality", "municipal council", "town panchayat",
    "gram panchayat", "panchayat raj", "city municipal",
    "ಮಹಾನಗರ ಪಾಲಿಕೆ", "ನಗರಸಭೆ", "ಪಂಚಾಯತಿ", "ಗ್ರಾಮ ಪಂಚಾಯತಿ",
    "नगर निगम", "नगरपालिका", "पंचायत",
]

# ------------------------------------------------------------- emergency ------
EMERGENCY_PATTERNS: list[str] = [
    # English
    "serious accident", "road accident", "accident", "hit and run", "on fire",
    "catch fire", "house fire", "forest fire", "burning", "flames",
    "serious injury", "bleeding", "unconscious", "collapsed", "building collapse",
    "wall collapse", "heart attack", "chest pain", "exposed wire", "live wire",
    "sparking", "open wire", "electrocuted", "shock", "danger to life",
    "immediate danger", "life threat", "died", "death",
    # Kannada
    "ಅಪಘಾತ", "ಅಪಾಯಕಾರಿ", "ಬೆಂಕಿ", "ಹೊತ್ತಿಕೊಂಡ", "ಗಾಯ", "ರಕ್ತಸ್ರಾವ",
    "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ", "ಕುಸಿದ", "ಕುಸಿದಿದೆ", "ನಗ್ನ ತಂತಿ", "ಸ್ಪಾರ್ಕ್",
    "ವಿದ್ಯುತ್ ಆಘಾತ", "ಜೀವಕ್ಕೆ ಅಪಾಯ", "ಸಾವು",
    # Hindi
    "दुर्घटना", "गंभीर चोट", "घायल", "खून बह", "बेहोश", "गिर गया", "धंस",
    "आग लग", "जल", "नंगा तार", "स्पार्क", "करंट लग", "जान को खतरा",
    "मौत", "मर",
]

SAFETY_PATTERNS: list[str] = [
    # English
    "accident", "danger", "dangerous", "unsafe", "sparking", "children",
    "school children", "risk", "hazard", "injured", "may fall", "deep hole",
    # Kannada
    "ಅಪಘಾತ", "ಅಪಾಯ", "ಅಪಾಯಕಾರಿ", "ಮಕ್ಕಳು", "ಶಾಲಾ ಮಕ್ಕಳು", "ಗಾಯ", "ಬೀಳಬಹುದು",
    # Hindi
    "दुर्घटना", "खतरा", "खतरनाक", "बच्चे", "स्कूल के बच्चे", "घायल", "गिर सकती",
]

# --------------------------------------------------------------- duration -----
DURATION_PATTERNS: list[str] = [
    # English: "for 3 days", "since 2 weeks", "3 days ago"
    r"(?:for|since|past|last)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months)",
    r"(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months)\s+(?:ago|since|back)",
    # Kannada: "3 ದಿನಗಳಿಂದ", "ಒಂದು ವಾರ"
    r"(\d+|ಒಂದು|ಎರಡು|ಮೂರು|ನಾಲ್ಕು|ಐದು|ಆರು|ಏಳು|ಎಂಟು|ಒಂಬತ್ತು|ಹತ್ತು)\s+(ದಿನ|ದಿನಗಳ|ದಿನಗಳಿಂದ|ವಾರ|ವಾರದಿಂದ|ತಿಂಗಳ)",
    # Hindi: "3 दिनों से", "दो हफ्ते"
    r"(\d+|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस)\s+(दिन|दिनों|हफ्ते|हफ़्ते|महीने)",
]

_UNIT_DAYS = {"day": 1, "days": 1, "week": 7, "weeks": 7, "month": 30, "months": 30,
              "ದಿನ": 1, "ದಿನಗಳ": 1, "ದಿನಗಳಿಂದ": 1, "ವಾರ": 7, "ವಾರದಿಂದ": 7, "ತಿಂಗಳ": 30,
              "दिन": 1, "दिनों": 1, "हफ्ते": 7, "हफ़्ते": 7, "महीने": 30}

# ------------------------------------------------------------- road type ------
ROAD_TYPE_WORDS: dict[str, list[str]] = {
    "highway": ["state highway", "national highway", "highway", "ರಾಜ್ಯ ಹೆದ್ದಾರಿ",
                "ಹೆದ್ದಾರಿ", "राज्य राजमार्ग", "हाईवे", "मुख्य राजमार्ग"],
    "rural": ["village road", "rural road", "gram panchayat road", "ಹಳ್ಳಿ ರಸ್ತೆ",
              "ಗ್ರಾಮೀಣ ರಸ್ತೆ", "गाँव की सड़क", "ग्रामीण सड़क"],
    "urban": ["city road", "municipal road", "corporation road", "urban road",
              "ನಗರ ರಸ್ತೆ", "ನಗರಸಭೆ ರಸ್ತೆ", "शहर की सड़क", "नगर निगम की सड़क"],
}

# ---------------------------------------------------- conversation signals ----
AFFIRMATIVE: list[str] = [
    "yes", "yes please", "yeah", "ok", "okay", "confirm", "proceed", "submit",
    "do it", "correct", "sure", "go ahead", "looks good",
    "हाँ", "हां", "जी", "ठीक है", "करो", "भेजो", "पुष्टि",
    "ಹೌದು", "ಹೌದೆ", "ಸರಿ", "ಆಗಲಿ", "ಸಲ್ಲಿಸಿ", "ಮುಂದುವರಿ",
]
NEGATIVE: list[str] = [
    "no", "nope", "cancel", "stop", "don't", "do not", "wrong", "edit",
    "नहीं", "रद्द", "गलत", "रोको",
    "ಇಲ್ಲ", "ಬೇಡ", "ರದ್ದು", "ತಪ್ಪು",
]
DONT_KNOW: list[str] = [
    "don't know", "dont know", "not sure", "unknown", "no idea", "skip",
    "पता नहीं", "नहीं मालूम", "छोड़ दो",
    "ಗೊತ್ತಿಲ್ಲ", "ತಿಳಿದಿಲ್ಲ", "ಬಿಟ್ಟುಬಿಡಿ",
]

GREETING_WORDS: list[str] = [
    "hello", "hi", "hey", "good morning", "namaste", "namaskara",
    "नमस्ते", "नमस्कार", "ನಮಸ್ತೆ", "ನಮಸ್ಕಾರ",
]

# ------------------------------------------------------ translation phrases ---
# Canonical civic phrase -> per-language text. Demo phrase-table translation.
TRANSLATION_PHRASES: dict[str, dict[str, str]] = {
    "no_water": {
        "en": "There is no water supply in our area.",
        "kn": "ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ನೀರಿನ ಸರಬರಾಜು ಇಲ್ಲ.",
        "hi": "हमारे इलाके में पानी की आपूर्ति नहीं है।",
    },
    "pothole_road": {
        "en": "There is a big pothole on the road.",
        "kn": "ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ.",
        "hi": "सड़क पर बड़ा गड्ढा है।",
    },
    "garbage_not_collected": {
        "en": "Garbage is not being collected.",
        "kn": "ಕಸ ಸಂಗ್ರಹಣೆ ಆಗುತ್ತಿಲ್ಲ.",
        "hi": "कचरा नहीं उठाया जा रहा है।",
    },
    "no_electricity": {
        "en": "There is no electricity.",
        "kn": "ವಿದ್ಯುತ್ ಇಲ್ಲ.",
        "hi": "बिजली नहीं है।",
    },
    "streetlight_not_working": {
        "en": "The street light is not working.",
        "kn": "ಬೀದಿ ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ.",
        "hi": "स्ट्रीट लाइट काम नहीं कर रही है।",
    },
    "drainage_overflow": {
        "en": "Drainage water is overflowing.",
        "kn": "ಚರಂಡಿ ನೀರು ತುಂಬಿ ಹರಿಯುತ್ತಿದೆ.",
        "hi": "नाली का पानी बाहर आ रहा है।",
    },
    "accident": {
        "en": "There has been a road accident.",
        "kn": "ರಸ್ತೆ ಅಪಘಾತ ಆಗಿದೆ.",
        "hi": "सड़क दुर्घटना हो गई है।",
    },
    "fire": {
        "en": "There is a fire.",
        "kn": "ಬೆಂಕಿ ಹೊತ್ತಿಕೊಂಡಿದೆ.",
        "hi": "आग लग गई है।",
    },
    "exposed_wire": {
        "en": "There is an exposed electrical wire.",
        "kn": "ನಗ್ನ ವಿದ್ಯುತ್ ತಂತಿ ಇದೆ.",
        "hi": "खुला बिजली का तार है।",
    },
    "hospital_no_doctor": {
        "en": "There is no doctor at the government hospital.",
        "kn": "ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ವೈದ್ಯರು ಇಲ್ಲ.",
        "hi": "सरकारी अस्पताल में डॉक्टर नहीं है।",
    },
    "bus_not_coming": {
        "en": "The bus is not coming.",
        "kn": "ಬಸ್ ಬರುತ್ತಿಲ್ಲ.",
        "hi": "बस नहीं आ रही है।",
    },
    "please_help": {
        "en": "Please help.",
        "kn": "ದಯವಿಟ್ಟು ಸಹಾಯ ಮಾಡಿ.",
        "hi": "कृपया मदद करें।",
    },
}

# Word-level bilingual dictionary used by the demo phrase-table translator.
WORD_DICT: dict[str, str] = {
    # English -> Kannada
    "water": "ನೀರು", "road": "ರಸ್ತೆ", "pothole": "ಗುಂಡಿ", "garbage": "ಕಸ",
    "electricity": "ವಿದ್ಯುತ್", "light": "ದೀಪ", "street": "ಬೀದಿ", "house": "ಮನೆ",
    "not": "ಇಲ್ಲ", "coming": "ಬರುತ್ತಿದೆ", "there": "ಇದೆ", "is": "ಆಗಿದೆ",
    "school": "ಶಾಲೆ", "college": "ಕಾಲೇಜ್", "hospital": "ಆಸ್ಪತ್ರೆ",
    "bus": "ಬಸ್", "market": "ಮಾರುಕಟ್ಟೆ", "drain": "ಚರಂಡಿ", "fire": "ಬೆಂಕಿ",
    "accident": "ಅಪಘಾತ", "danger": "ಅಪಾಯ", "children": "ಮಕ್ಕಳು",
    "please": "ದಯವಿಟ್ಟು", "help": "ಸಹಾಯ", "days": "ದಿನಗಳು", "area": "ಪ್ರದೇಶ",
    # English -> Hindi
    "water|hi": "पानी", "road|hi": "सड़क", "pothole|hi": "गड्ढा",
    "garbage|hi": "कचरा", "electricity|hi": "बिजली", "light|hi": "बत्ती",
    "street|hi": "गली", "house|hi": "घर", "not|hi": "नहीं", "coming|hi": "आ रहा",
    "there|hi": "है", "school|hi": "स्कूल", "college|hi": "कॉलेज",
    "hospital|hi": "अस्पताल", "bus|hi": "बस", "market|hi": "बाज़ार",
    "drain|hi": "नाली", "fire|hi": "आग", "accident|hi": "दुर्घटना",
    "danger|hi": "खतरा", "children|hi": "बच्चे", "please|hi": "कृपया",
    "help|hi": "मदद", "days|hi": "दिन", "area|hi": "इलाका",
}

# --------------------------------------------------- training corpus (ML) -----
# (text, category) — labelled samples across en/kn/hi for the sklearn model.
TRAINING_CORPUS: list[tuple[str, str]] = [
    # road_damage
    ("There is a huge pothole near my college in Mysuru.", "road_damage"),
    ("The road in front of our house is completely broken.", "road_damage"),
    ("Large potholes on the main road cause accidents every day.", "road_damage"),
    ("ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ.", "road_damage"),
    ("ರಸ್ತೆಯ ಟಾರ್ ಹಾಳಾಗಿ ವಾಹನ ಸವಾರರಿಗೆ ತೊಂದರೆ.", "road_damage"),
    ("ಕಾಲೇಜ್ ಹತ್ತಿರದ ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿಗಳಿವೆ.", "road_damage"),
    ("सामने की सड़क में बहुत बड़ा गड्ढा है।", "road_damage"),
    ("मुख्य सड़क की मरम्मत नहीं हो रही, गड्ढे हो गए हैं।", "road_damage"),
    # water_supply
    ("There is no water supply in our area for three days.", "water_supply"),
    ("Drinking water is not coming through the pipes.", "water_supply"),
    ("Water supply is interrupted every morning in our layout.", "water_supply"),
    ("ನಮ್ಮ ಏರಿಯಾದಲ್ಲಿ ಮೂರು ದಿನಗಳಿಂದ ನೀರು ಬರುತ್ತಿಲ್ಲ.", "water_supply"),
    ("ಕುಡಿಯುವ ನೀರಿಗೆ ತೊಂದರೆ ಆಗಿದೆ. ಪೈಪ್‌ನಲ್ಲಿ ನೀರು ಬರುತ್ತಿಲ್ಲ.", "water_supply"),
    ("ಹಳ್ಳಿಯಲ್ಲಿ ನೀರಿನ ಸರಬರಾಜು ನಿಂತಿದೆ.", "water_supply"),
    ("ನನ್ನ ಏರಿಯಾದಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ.", "water_supply"),
    ("ನಮ್ಮ ಊರಿನಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ, ಟ್ಯಾಪ್‌ನಲ್ಲಿ ನೀರು ಬರುತ್ತಿಲ್ಲ.", "water_supply"),
    ("ವಾರ್ಡ್‌ನಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ, ಸರಬರಾಜು ಸರಿಯಾಗಿ ಬರುತ್ತಿಲ್ಲ.", "water_supply"),
    ("हमारे इलाके में तीन दिनों से पानी नहीं आ रहा है।", "water_supply"),
    ("पीने का पानी पाइप में नहीं आ रहा, जल आपूर्ति बाधित है।", "water_supply"),
    # drainage_sewage
    ("Drainage water is overflowing onto the road.", "drainage_sewage"),
    ("The manhole near the market is clogged and smelling.", "drainage_sewage"),
    ("Sewage water is stagnant in our street.", "drainage_sewage"),
    ("ಚರಂಡಿ ನೀರು ರಸ್ತೆಗೆ ಹರಿಯುತ್ತಿದೆ.", "drainage_sewage"),
    ("ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರದ ಮೇಲೆದ್ದರಿಗೆ ಚರಂಡಿ ತುಂಬಿಹೋಗಿದೆ.", "drainage_sewage"),
    ("ನಮ್ಮ ಬೀದಿಯಲ್ಲಿ ಮಲಮೂತ್ರದ ನೀರು ನಿಂತಿದೆ.", "drainage_sewage"),
    ("नाली का पानी सड़क पर बह रहा है।", "drainage_sewage"),
    ("बाज़ार के पास नाला जाम है और बदबू आ रही है।", "drainage_sewage"),
    # garbage_collection
    ("Garbage is not collected for a week in our street.", "garbage_collection"),
    ("Piles of garbage on the road, no sweeping done.", "garbage_collection"),
    ("The waste bin near the market is overflowing.", "garbage_collection"),
    ("ನಮ್ಮ ಬೀದಿಯಲ್ಲಿ ವಾರದಿಂದ ಕಸ ಸಂಗ್ರಹಣೆ ಆಗುತ್ತಿಲ್ಲ.", "garbage_collection"),
    ("ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ಕಸ ಬಿದ್ದಿದೆ. ಯಾರೂ ಸ್ವಚ್ಛಗೊಳಿಸುತ್ತಿಲ್ಲ.", "garbage_collection"),
    ("ಕಸದ ಬುಟ್ಟಿ ತುಂಬಿಹೋಗಿದೆ. ಕಸ ಸಂಗ್ರಹಣೆ ಆಗುತ್ತಿಲ್ಲ.", "garbage_collection"),
    ("हमारी गली में एक हफ्ते से कूड़ा नहीं उठाया जा रहा।", "garbage_collection"),
    ("सड़क पर कचरा भरा पड़ा है, सफाई नहीं होती।", "garbage_collection"),
    # electricity
    ("No electricity in our area since last night.", "electricity"),
    ("Power cut daily for six hours in our colony.", "electricity"),
    ("The transformer near the school is making loud noise.", "electricity"),
    ("ನಮ್ಮ ಏರಿಯಾದಲ್ಲಿ ರಾತ್ರಿಯಿಂದ ವಿದ್ಯುತ್ ಇಲ್ಲ.", "electricity"),
    ("ಪ್ರತಿದಿನ ಆರು ಗಂಟೆ ವಿದ್ಯುತ್ ಕಡಿತ ಆಗುತ್ತಿದೆ.", "electricity"),
    ("ಶಾಲೆ ಹತ್ತಿರದ ಟ್ರಾನ್ಸ್ಫಾರ್ಮರ್ ಶಬ್ದ ಮಾಡುತ್ತಿದೆ.", "electricity"),
    ("रात से हमारे इलाके में बिजली नहीं है।", "electricity"),
    ("रोज़ छह घंटे बिजली कटौती होती है, ट्रांसफार्मर खराब है।", "electricity"),
    # streetlights
    ("Street light in front of our house is not working.", "streetlights"),
    ("No street lights on this road at night.", "streetlights"),
    ("The lamp post near the bus stop is broken.", "streetlights"),
    ("ನಮ್ಮ ಮನೆ ಮುಂದಿನ ಬೀದಿ ದೀಪ ಉರಿಯುತ್ತಿಲ್ಲ.", "streetlights"),
    ("ಈ ರಸ್ತೆಯಲ್ಲಿ ರಾತ್ರಿ ಯಾವ ದೀಪವೂ ಇಲ್ಲ.", "streetlights"),
    ("ಬಸ್ ನಿಲ್ದಾಣ ಹತ್ತಿರದ ಲೈಟ್ ಪೋಸ್ಟ್ ಹಾಳಾಗಿದೆ.", "streetlights"),
    ("हमारे घर के सामने की स्ट्रीट लाइट नहीं जलती।", "streetlights"),
    ("इस सड़क पर रात में कोई बत्ती नहीं है, लाइट खराब है।", "streetlights"),
    # public_health
    ("Dengue cases are rising due to stagnant water here.", "public_health"),
    ("Mosquitoes are breeding in the open drain.", "public_health"),
    ("Unhygienic conditions near the market are causing disease.", "public_health"),
    ("ನಿಂತ ನೀರಿನಿಂದ ಡೆಂಗ್ಯೂ ಪ್ರಕರಣಗಳು ಹೆಚ್ಚಾಗಿವೆ.", "public_health"),
    ("ತೆರೆದ ಚರಂಡಿಯಲ್ಲಿ ಸೊಳ್ಳೆಗಳು ಸಂತಾನೋತ್ಪತ್ತಿ ಮಾಡುತ್ತಿವೆ.", "public_health"),
    ("ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ಅನಾರೋಗ್ಯಕರ ಪರಿಸ್ಥಿತಿ ಇದೆ.", "public_health"),
    ("यहाँ जमे पानी से डेंगू के केस बढ़ रहे हैं।", "public_health"),
    ("खुली नाली में मच्छर पनप रहे हैं, बीमारी फैल रही है।", "public_health"),
    # government_hospitals
    ("Government hospital has no doctors in the morning.", "government_hospitals"),
    ("Medicines are not available at the PHC.", "government_hospitals"),
    ("The health center was closed when we visited.", "government_hospitals"),
    ("ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಬೆಳಿಗ್ಗೆ ವೈದ್ಯರು ಇರುತ್ತಿಲ್ಲ.", "government_hospitals"),
    ("ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರದಲ್ಲಿ ಔಷಧಿ ಸಿಗುತ್ತಿಲ್ಲ.", "government_hospitals"),
    ("ಆರೋಗ್ಯ ಕೇಂದ್ರ ಬಾಗಿಲು ಹಾಕಿತ್ತು.", "government_hospitals"),
    ("सरकारी अस्पताल में सुबह डॉक्टर नहीं मिलते।", "government_hospitals"),
    ("PHC में दवाइयाँ नहीं मिल रहीं, स्वास्थ्य केंद्र बंद मिला।", "government_hospitals"),
    # public_transport
    ("Buses are not plying on this route since morning.", "public_transport"),
    ("Bus service to our village is cancelled.", "public_transport"),
    ("The KSRTC bus did not stop at the bus stop.", "public_transport"),
    ("ಬೆಳಿಗ್ಗೆಯಿಂದ ಈ ಮಾರ್ಗದಲ್ಲಿ ಬಸ್ ಸಂಚಾರ ಇಲ್ಲ.", "public_transport"),
    ("ನಮ್ಮ ಹಳ್ಳಿಗೆ ಬಸ್ ಸೇವೆ ರದ್ದಾಗಿದೆ.", "public_transport"),
    ("ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ಬಸ್ ನಿಲ್ಲದೆ ಹೋಯಿತು.", "public_transport"),
    ("सुबह से इस रूट पर बस नहीं चल रही।", "public_transport"),
    ("हमारे गाँव की बस सेवा रद्द है, बस स्टैंड पर बस नहीं रुकी।", "public_transport"),
    # road_safety
    ("Traffic signal at the junction is not working.", "road_safety"),
    ("There is no zebra crossing near the school.", "road_safety"),
    ("Speed breaker is missing at the accident spot.", "road_safety"),
    ("ಜಂಕ್ಷನ್‌ನಲ್ಲಿ ಸಿಗ್ನಲ್ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ.", "road_safety"),
    ("ಶಾಲೆ ಹತ್ತಿರ ಜೆಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಇಲ್ಲ.", "road_safety"),
    ("ಅಪಘಾತ ಆಗುವ ಜಾಗದಲ್ಲಿ ಸ್ಪೀಡ್ ಬ್ರೇಕರ್ ಇಲ್ಲ.", "road_safety"),
    ("चौराहे पर ट्रैफिक सिग्नल काम नहीं कर रहा।", "road_safety"),
    ("स्कूल के पास ज़ेब्रा क्रॉसिंग नहीं है, स्पीड ब्रेकर भी नहीं।", "road_safety"),
    # environmental_pollution
    ("Factory smoke is polluting the air in our area.", "environmental_pollution"),
    ("Dirty water is flowing into the lake.", "environmental_pollution"),
    ("Dust from the stone crusher is unbearable.", "environmental_pollution"),
    ("ಕಾರ್ಖಾನೆಯ ಹೊಗೆಯಿಂದ ವಾಯು ಮಾಲಿನ್ಯ ಆಗುತ್ತಿದೆ.", "environmental_pollution"),
    ("ಕೆರೆಗೆ ಕಲುಷಿತ ನೀರು ಹರಿಯುತ್ತಿದೆ.", "environmental_pollution"),
    ("ಕಲ್ಲು ಗಣಿಯ ಧೂಳು ತಡೆಯಲಾಗುತ್ತಿಲ್ಲ.", "environmental_pollution"),
    ("कारखाने के धुएं से हवा प्रदूषित हो रही है।", "environmental_pollution"),
    ("गंदा पानी तालाब में जा रहा है, धूल से परेशानी है।", "environmental_pollution"),
    # public_infrastructure
    ("The footpath near the market is broken.", "public_infrastructure"),
    ("Public toilet in the park is not maintained.", "public_infrastructure"),
    ("The bus shelter was damaged in the rain.", "public_infrastructure"),
    ("ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರದ ಫುಟ್‌ಪಾತ್ ಹಾಳಾಗಿದೆ.", "public_infrastructure"),
    ("ಉದ್ಯಾನದ ಸಾರ್ವಜನಿಕ ಶೌಚಾಲಯ ಸರಿಯಾಗಿ ಇಲ್ಲ.", "public_infrastructure"),
    ("ಮಳೆಯಿಂದ ಬಸ್ ತಂಗುವ ಸ್ಥಳ ಹಾಳಾಗಿದೆ.", "public_infrastructure"),
    ("बाज़ार के पास फुटपाथ टूटा हुआ है।", "public_infrastructure"),
    ("पार्क का सार्वजनिक शौचालय ठीक नहीं है, बस शेल्टर खराब है।", "public_infrastructure"),
    # animal_welfare
    ("Stray dogs are chasing school children.", "animal_welfare"),
    ("An injured bull is lying on the main road.", "animal_welfare"),
    ("A dead animal on the road is not being removed.", "animal_welfare"),
    ("ಶಾಲಾ ಮಕ್ಕಳನ್ನು ಕಾಡು ನಾಯಿಗಳು ಓಡಿಸುತ್ತಿವೆ.", "animal_welfare"),
    ("ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ಗಾಯಗೊಂಡ ಹಸು ಇದೆ.", "animal_welfare"),
    ("ರಸ್ತೆಯಲ್ಲಿ ಮೃತ ಪ್ರಾಣಿಯನ್ನು ತೆಗೆಯುತ್ತಿಲ್ಲ.", "animal_welfare"),
    ("सड़क पर आवारा कुत्ते बच्चों को डरा रहे हैं।", "animal_welfare"),
    ("मुख्य सड़क पर घायल बैल पड़ा है, मरा हुआ जानवर नहीं हटाया जा रहा।", "animal_welfare"),
    # fire_emergency
    ("There is a fire in the shop near the market.", "fire_emergency"),
    ("Smoke is coming from the building.", "fire_emergency"),
    ("Fire broke out in the waste yard.", "fire_emergency"),
    ("ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರದ ಅಂಗಡಿಯಲ್ಲಿ ಬೆಂಕಿ ಕಾಣಿಸಿಕೊಂಡಿದೆ.", "fire_emergency"),
    ("ಕಟ್ಟಡದಿಂದ ಹೊಗೆ ಬರುತ್ತಿದೆ.", "fire_emergency"),
    ("ಕಸದ ಜಾಗದಲ್ಲಿ ಬೆಂಕಿ ಹೊತ್ತಿಕೊಂಡಿದೆ.", "fire_emergency"),
    ("बाज़ार के पास दुकान में आग लग गई है।", "fire_emergency"),
    ("इमारत से धुआं आ रहा है, कचरे में आग लग गई है।", "fire_emergency"),
    # other
    ("I want to report a civic problem in my area.", "other"),
    ("There is an issue near my house that needs attention.", "other"),
    ("This is a complaint about public services in our ward.", "other"),
    ("ನನ್ನ ಪ್ರದೇಶದಲ್ಲಿ ಒಂದು ಸಮಸ್ಯೆ ಇದೆ ವರದಿ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ.", "other"),
    ("ನನ್ನ ಮನೆ ಹತ್ತಿರ ಗಮನ ಬೇಕಾದ ಸಮಸ್ಯೆ ಇದೆ.", "other"),
    ("ಇದು ಸಾರ್ವಜನಿಕ ಸೇವೆಗಳ ಬಗ್ಗೆ ದೂರು.", "other"),
    ("मैं अपने इलाके की समस्या की शिकायत करना चाहता हूँ।", "other"),
    ("सार्वजनिक सेवाओं के बारे में यह शिकायत है जिस पर ध्यान चाहिए।", "other"),
]

# Deterministic augmentation prefixes (location-flavoured) multiply the corpus.
CORPUS_PREFIXES = [
    "", "In Mysuru, ", "ಮೈಸೂರಿನಲ್ಲಿ, ", "मैसूर में, ",
    "Near our house, ", "ನಮ್ಮ ಮನೆ ಹತ್ತಿರ, ", "हमारे घर के पास, ",
]
