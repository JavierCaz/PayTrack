import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import en from './en';
import es from './es';
import type { Translation } from './en';

type AppLocale = 'en' | 'es';

const translations: Record<AppLocale, Translation> = { en, es };

interface LocaleContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

function detectDeviceLocale(): AppLocale {
  try {
    const locales = getLocales();
    const primary = locales?.[0]?.languageCode;
    return primary === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

function resolveValue(obj: Translation, key: string): string {
  const value = (obj as any)[key];
  return typeof value === 'string' ? value : key;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val != null ? String(val) : `{${key}}`;
  });
}

interface LocaleProviderProps {
  children: ReactNode;
  onLocaleChange?: (locale: AppLocale) => Promise<void>;
  initialLocale?: AppLocale;
}

// Module-level state for non-React usage (services, etc.)
let _locale: AppLocale = detectDeviceLocale();

export function setLocaleGlobal(locale: AppLocale) {
  _locale = locale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const text = resolveValue(translations[_locale], key);
  return interpolate(text, params);
}

export function LocaleProvider({ children, onLocaleChange, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale || detectDeviceLocale());

  useEffect(() => {
    setLocaleGlobal(locale);
  }, []);

  const setLocale = useCallback(async (newLocale: AppLocale) => {
    setLocaleState(newLocale);
    setLocaleGlobal(newLocale);
    if (onLocaleChange) {
      await onLocaleChange(newLocale);
    }
  }, [onLocaleChange]);

  const tHook = useCallback((key: string, params?: Record<string, string | number>): string => {
    const text = resolveValue(translations[locale], key);
    return interpolate(text, params);
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: tHook }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LocaleContext);
}

export type { AppLocale as Locale };
