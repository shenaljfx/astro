/**
 * Language Context - provides app-wide language state
 * Allows all screens to reactively update when language changes
 *
 * Priority: AsyncStorage('appLanguage') > user.preferences.language > 'en'
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage as setI18nLanguage, getLanguage, t as translate } from '../services/i18n';

const LanguageContext = createContext();
const STORAGE_KEY = 'appLanguage';

export function LanguageProvider({ children }) {
  const [language, setLang] = useState('si');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) Check AsyncStorage first (user's explicit choice)
        var saved = await AsyncStorage.getItem(STORAGE_KEY);

        // 2) If nothing saved, check user profile from AuthContext storage
        if (!saved) {
          try {
            var userRaw = await AsyncStorage.getItem('nakath_user_profile');
            if (userRaw) {
              var userData = JSON.parse(userRaw);
              if (userData?.preferences?.language) {
                saved = userData.preferences.language;
              }
            }
          } catch (_) { /* ignore */ }
        }

        // 3) Default to Sinhala for Sri Lankan audience
        var lang = (saved === 'en' || saved === 'si') ? saved : 'si';
        setI18nLanguage(lang);
        setLang(lang);
        await AsyncStorage.setItem(STORAGE_KEY, lang);
      } catch (_) {
        setI18nLanguage('si');
        setLang('si');
      }
      setIsReady(true);
    })();
  }, []);

  const switchLanguage = useCallback((lang) => {
    if (lang !== 'en' && lang !== 'si') return;
    setI18nLanguage(lang);
    setLang(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = language === 'en' ? 'si' : 'en';
    setI18nLanguage(next);
    setLang(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, [language]);

  const t = useCallback((key) => {
    return translate(key);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

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
