import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, normalizeLocale } from "./locale";
import { resolveInitialLocale, WebLocalStorageLocaleStorage, type LocaleStorage } from "./localeStorage";
import { createTranslator } from "./resources";
import type { I18nContextValue, SupportedLocale } from "./types";

const defaultValue: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: createTranslator(DEFAULT_LOCALE)
};

export const I18nContext = createContext<I18nContextValue>(defaultValue);

type I18nProviderProps = {
  children: ReactNode;
  storage?: LocaleStorage;
  browserLocale?: string;
  initialLocale?: SupportedLocale;
};

function currentBrowserLocale(): string | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.language;
}

export function I18nProvider({ children, storage, browserLocale, initialLocale }: I18nProviderProps) {
  const storageRef = useRef<LocaleStorage>();
  if (!storageRef.current) storageRef.current = storage ?? new WebLocalStorageLocaleStorage();

  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    initialLocale ? normalizeLocale(initialLocale) : resolveInitialLocale(storageRef.current!, browserLocale ?? currentBrowserLocale())
  );

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    const normalized = normalizeLocale(nextLocale);
    setLocaleState(normalized);
    storageRef.current?.write(normalized);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t: createTranslator(locale) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
