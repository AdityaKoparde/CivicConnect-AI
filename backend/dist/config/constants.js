"use strict";
/** Shared domain constants: categories, statuses, transitions, labels. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_COOKIE = exports.SESSION_COOKIE = exports.TRACKING_COOKIE = exports.PUBLIC_UPDATE_KINDS = exports.PRIORITY_ORDER = exports.STATUS_TRANSITIONS = exports.COMPLAINT_STATUSES = exports.CATEGORY_MAP = exports.CATEGORY_KEYS = exports.CATEGORIES = void 0;
/** The 15 canonical complaint categories (seeded into the Category table). */
exports.CATEGORIES = [
    { key: 'road_damage', label: { en: 'Roads and Potholes', kn: 'ರಸ್ತೆ ಮತ್ತು ಗುಂಡಿಗಳು', hi: 'सड़क और गड्ढे' }, description: { en: 'Potholes, broken or uneven road surfaces' }, icon: 'Construction', sortOrder: 10 },
    { key: 'water_supply', label: { en: 'Water Supply', kn: 'ನೀರಿನ ಸರಬರಾಜು', hi: 'जल आपूर्ति' }, description: { en: 'No water, intermittent supply, leaking pipes' }, icon: 'Droplets', sortOrder: 20 },
    { key: 'drainage_sewage', label: { en: 'Drainage and Sewage', kn: 'ಚರಂಡಿ ಮತ್ತು ಮಲಮೂತ್ರ', hi: 'नाली और मल-मूत्र' }, description: { en: 'Blocked drains, overflowing sewage, stagnant water' }, icon: 'Waves', sortOrder: 30 },
    { key: 'garbage_collection', label: { en: 'Garbage Collection', kn: 'ಕಸ ಸಂಗ್ರಹಣೆ', hi: 'कचरा संग्रहण' }, description: { en: 'Uncollected waste, overflowing bins, no sweeping' }, icon: 'Trash2', sortOrder: 40 },
    { key: 'electricity', label: { en: 'Electricity', kn: 'ವಿದ್ಯುತ್', hi: 'बिजली' }, description: { en: 'Power cuts, transformer faults, voltage issues' }, icon: 'Zap', sortOrder: 50 },
    { key: 'streetlights', label: { en: 'Streetlights', kn: 'ಬೀದಿ ದೀಪಗಳು', hi: 'स्ट्रीट लाइट' }, description: { en: 'Broken or dead street lights' }, icon: 'Lightbulb', sortOrder: 60 },
    { key: 'public_health', label: { en: 'Public Health', kn: 'ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ', hi: 'सार्वजनिक स्वास्थ्य' }, description: { en: 'Sanitation, mosquito menace, disease risk' }, icon: 'HeartPulse', sortOrder: 70 },
    { key: 'government_hospitals', label: { en: 'Government Hospitals', kn: 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗಳು', hi: 'सरकारी अस्पताल' }, description: { en: 'Hospital services, staff, medicines' }, icon: 'Hospital', sortOrder: 80 },
    { key: 'public_transport', label: { en: 'Public Transport', kn: 'ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ', hi: 'सार्वजनिक परिवहन' }, description: { en: 'Bus services, stops, KSRTC issues' }, icon: 'Bus', sortOrder: 90 },
    { key: 'road_safety', label: { en: 'Road Safety', kn: 'ರಸ್ತೆ ಸುರಕ್ಷತೆ', hi: 'सड़क सुरक्षा' }, description: { en: 'Signals, signboards, crossings, dividers' }, icon: 'TrafficCone', sortOrder: 100 },
    { key: 'environmental_pollution', label: { en: 'Environmental Pollution', kn: 'ಪರಿಸರ ಮಾಲಿನ್ಯ', hi: 'पर्यावरण प्रदूषण' }, description: { en: 'Air, water, noise pollution' }, icon: 'CloudFog', sortOrder: 110 },
    { key: 'public_infrastructure', label: { en: 'Public Infrastructure', kn: 'ಸಾರ್ವಜನಿಕ ಮೂಲಸೌಕರ್ಯ', hi: 'सार्वजनिक अवसंरचना' }, description: { en: 'Footpaths, bridges, shelters, public toilets' }, icon: 'Landmark', sortOrder: 120 },
    { key: 'animal_welfare', label: { en: 'Animal Welfare', kn: 'ಪ್ರಾಣಿ ಸಂಕ್ಷೇಮ', hi: 'पशु कल्याण' }, description: { en: 'Stray animals, injured cattle, menace' }, icon: 'PawPrint', sortOrder: 130 },
    { key: 'fire_emergency', label: { en: 'Fire and Emergency', kn: 'ಬೆಂಕಿ ಮತ್ತು ತುರ್ತು ಸೇವೆ', hi: 'आग और आपातकाल' }, description: { en: 'Fire incidents and emergency response' }, icon: 'Flame', sortOrder: 140 },
    { key: 'other', label: { en: 'Other Civic Issues', kn: 'ಇತರ ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳು', hi: 'अन्य नागरिक समस्याएँ' }, description: { en: 'Anything that does not fit the above' }, icon: 'FileQuestion', sortOrder: 150 },
];
exports.CATEGORY_KEYS = new Set(exports.CATEGORIES.map((c) => c.key));
exports.CATEGORY_MAP = new Map(exports.CATEGORIES.map((c) => [c.key, c]));
exports.COMPLAINT_STATUSES = [
    'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
    'AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED',
];
/** Allowed status transitions (enforced server-side). */
exports.STATUS_TRANSITIONS = {
    SUBMITTED: ['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'ESCALATED'],
    ACKNOWLEDGED: ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_CITIZEN_INFO', 'REJECTED', 'ESCALATED'],
    ASSIGNED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'AWAITING_CITIZEN_INFO', 'REJECTED', 'ESCALATED'],
    IN_PROGRESS: ['AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED'],
    AWAITING_CITIZEN_INFO: ['IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'],
    ESCALATED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'AWAITING_CITIZEN_INFO'],
    RESOLVED: ['ESCALATED'],
    REJECTED: [],
};
exports.PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
/** Update kinds the citizen can see when tracking. */
exports.PUBLIC_UPDATE_KINDS = ['STATUS', 'INFO_REQUEST', 'RESOLUTION', 'ESCALATION'];
exports.TRACKING_COOKIE = 'ccai_track_hint';
exports.SESSION_COOKIE = 'ccai_token';
exports.GUEST_COOKIE = 'ccai_guest';
//# sourceMappingURL=constants.js.map