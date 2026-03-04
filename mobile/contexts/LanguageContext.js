/**
 * Language Context - provides app-wide language state
 * Allows all screens to reactively update when language changes
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { setLanguage as setI18nLanguage, getLanguage, t as translate } from '../services/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLang] = useState(getLanguage());

  const switchLanguage = useCallback((lang) => {
    setI18nLanguage(lang);
    setLang(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = language === 'en' ? 'si' : 'en';
    setI18nLanguage(next);
    setLang(next);
  }, [language]);

  // t() that triggers re-render on language change
  const t = useCallback((key) => {
    return translate(key);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

export default LanguageContext;
