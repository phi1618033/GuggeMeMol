import { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const I18nContext = createContext();

function detectLanguage() {
  // Check localStorage first
  const saved = localStorage.getItem('lang');
  if (saved && translations[saved]) return saved;

  // Auto-detect from browser
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && translations[browserLang]) return browserLang;

  return 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  }, []);

  const t = useCallback((key, params = {}) => {
    const str = translations[lang]?.[key] || translations.en?.[key] || key;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}

export const LANGUAGES = [
  { code: 'en', flag: '\ud83c\uddec\ud83c\udde7' },
  { code: 'de', flag: '\ud83c\udde9\ud83c\uddea' },
];
