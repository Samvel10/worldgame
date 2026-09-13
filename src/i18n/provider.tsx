/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getNestedValue, interpolate } from './utils';
import type { LanguageCode } from './translations';

interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: LanguageCode;
}

export function I18nProvider({ children, defaultLanguage = 'hy' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'hy' || saved === 'en' || saved === 'ru')) {
      return saved as LanguageCode;
    }
    return defaultLanguage;
  });

  // Persist language choice
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  function setLanguage(lang: LanguageCode) {
    setLanguageState(lang);
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const value = getNestedValue(language, key);
    if (typeof value === 'string') {
      return interpolate(value, params);
    }
    console.warn(`Translation missing: ${language}.${key}`);
    return key;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
