/**
 * Language Context - provides app-wide language state
 * Allows all screens to reactively update when language changes
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage as setI18nLanguage, getLanguage, t as translate } from '../services/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLang] = useState(getLanguage());
  const [isReady, setIsReady] = useState(false);

  // Load saved language on mount before rendering children
  useEffect(() => {
    AsyncStorage.getItem('appLanguage').then((saved) => {
      if (saved && (saved === 'en' || saved === 'si')) {
        setI18nLanguage(saved);
        setLang(saved);
      }
      setIsReady(true);
    }).catch(() => {
      setIsReady(true);
    });
  }, []);

  const switchLanguage = useCallback((lang) => {
    setI18nLanguage(lang);
    setLang(lang);
    AsyncStorage.setItem('appLanguage', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = language === 'en' ? 'si' : 'en';
    setI18nLanguage(next);
    setLang(next);
    AsyncStorage.setItem('appLanguage', next);
  }, [language]);

  // t() that triggers re-render on language change
  const t = useCallback((key) => {
    return translate(key);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render until saved language is loaded
  if (!isReady) return null;

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
