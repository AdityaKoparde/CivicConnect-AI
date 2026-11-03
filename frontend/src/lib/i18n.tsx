/** Minimal trilingual UI dictionary (en / kn / hi) for page chrome.
 *  The chatbot conversation itself is translated by the Python AI service. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'kn' | 'hi';

export const STRINGS: Record<string, Record<Lang, string>> = {
  'nav.home': { en: 'Home', kn: 'ಮುಖಪುಟ', hi: 'होम' },
  'nav.chat': { en: 'Report an issue', kn: 'ದೂರು ನೀಡಿ', hi: 'शिकायत दर्ज करें' },
  'nav.track': { en: 'Track', kn: 'ಟ್ರ್ಯಾಕ್', hi: 'ट्रैक' },
  'nav.dashboard': { en: 'Dashboard', kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', hi: 'डैशबोर्ड' },
  'nav.login': { en: 'Sign in', kn: 'ಸೈನ್ ಇನ್', hi: 'साइन इन' },
  'nav.logout': { en: 'Sign out', kn: 'ಸೈನ್ ಔಟ್', hi: 'साइन आउट' },
  'nav.notifications': { en: 'Notifications', kn: 'ಅಧಿಸೂಚನೆಗಳು', hi: 'सूचनाएँ' },
  'hero.tagline': {
    en: 'Your Voice. Your Language. Your City.',
    kn: 'ನಿಮ್ಮ ಧ್ವನಿ. ನಿಮ್ಮ ಭಾಷೆ. ನಿಮ್ಮ ನಗರ.',
    hi: 'आपकी आवाज़। आपकी भाषा। आपका शहर।',
  },
  'hero.sub': {
    en: 'Report civic problems in Kannada, English or Hindi — AI routes them to the right department and gives you a tracking ID.',
    kn: 'ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಹಿಂದಿಯಲ್ಲಿ ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಿ — AI ಅವುಗಳನ್ನು ಸರಿಯಾದ ಇಲಾಖೆಗೆ ಕಳುಹಿಸುತ್ತದೆ.',
    hi: 'कन्नड़, अंग्रेज़ी या हिंदी में नागरिक समस्याएँ बताएँ — AI उन्हें सही विभाग तक पहुँचाता है।',
  },
  'hero.ctaChat': { en: 'Report an issue', kn: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ', hi: 'समस्या बताएँ' },
  'hero.ctaTrack': { en: 'Track a complaint', kn: 'ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ', hi: 'शिकायत ट्रैक करें' },
  'chat.title': { en: 'CivicConnect Assistant', kn: 'ಸಿವಿಕ್‌ಕನೆಕ್ಟ್ ಸಹಾಯಕ', hi: 'सिविककनेक्ट सहायक' },
  'chat.placeholder': {
    en: 'Describe your problem in your language…',
    kn: 'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಿರಿ…',
    hi: 'अपनी समस्या अपनी भाषा में बताएँ…',
  },
  'chat.send': { en: 'Send', kn: 'ಕಳುಹಿಸಿ', hi: 'भेजें' },
  'chat.new': { en: 'New conversation', kn: 'ಹೊಸ ಸಂಭಾಷಣೆ', hi: 'नई बातचीत' },
  'chat.loading': { en: 'Thinking…', kn: 'ಯೋಚಿಸಲಾಗುತ್ತಿದೆ…', hi: 'सोच रहे हैं…' },
  'chat.confirmTitle': { en: 'Confirm your complaint', kn: 'ನಿಮ್ಮ ದೂರನ್ನು ದೃಢೀಕರಿಸಿ', hi: 'अपनी शिकायत की पुष्टि करें' },
  'chat.confirmYes': { en: 'Yes, register it', kn: 'ಹೌದು, ನೋಂದಾಯಿಸಿ', hi: 'हाँ, दर्ज करें' },
  'chat.confirmNo': { en: 'No, edit details', kn: 'ಇಲ್ಲ, ವಿವರ ಬದಲಿಸಿ', hi: 'नहीं, विवरण बदलें' },
  'chat.registered': { en: 'Complaint registered!', kn: 'ದೂರು ನೋಂದಾಯಿಸಲಾಗಿದೆ!', hi: 'शिकायत दर्ज हो गई!' },
  'chat.copy': { en: 'Copy', kn: 'ಕಾಪಿ', hi: 'कॉपी' },
  'chat.copied': { en: 'Copied', kn: 'ಕಾಪಿ ಮಾಡಲಾಗಿದೆ', hi: 'कॉपी हो गया' },
  'chat.tokenOnce': {
    en: 'Save this tracking token now — it is shown only once.',
    kn: 'ಈ ಟ್ರ್ಯಾಕಿಂಗ್ ಟೋಕನ್ ಅನ್ನು ಈಗ ಉಳಿಸಿ — ಇದು ಒಮ್ಮೆ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ.',
    hi: 'यह ट्रैकिंग टोकन अभी सहेजें — यह केवल एक बार दिखता है।',
  },
  'track.title': { en: 'Track your complaint', kn: 'ನಿಮ್ಮ ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ', hi: 'अपनी शिकायत ट्रैक करें' },
  'track.id': { en: 'Complaint ID', kn: 'ದೂರು ಐಡಿ', hi: 'शिकायत आईडी' },
  'track.token': { en: 'Tracking token', kn: 'ಟ್ರ್ಯಾಕಿಂಗ್ ಟೋಕನ್', hi: 'ट्रैकिंग टोकन' },
  'track.submit': { en: 'Track', kn: 'ಟ್ರ್ಯಾಕ್', hi: 'ट्रैक करें' },
  'common.loading': { en: 'Loading…', kn: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…', hi: 'लोड हो रहा है…' },
  'common.error': { en: 'Something went wrong', kn: 'ಏನೋ ತಪ್ಪಾಗಿದೆ', hi: 'कुछ गलत हो गया' },
  'common.retry': { en: 'Try again', kn: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', hi: 'पुनः प्रयास करें' },
};

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof STRINGS | string) => string;
}

const I18nContext = createContext<I18nState | null>(null);
const STORAGE_KEY = 'ccai_lang';

function readInitial(): Lang {
  if (typeof localStorage === 'undefined') return 'en';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'kn' || v === 'hi' || v === 'en' ? v : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitial);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string) => STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
