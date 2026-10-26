"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, localePath, type Locale } from "./config";
import { DICTS } from "./dict";
import { makeFormat } from "./format";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return { locale, t: DICTS[locale], href: (p: string) => localePath(locale, p), f: makeFormat(locale) };
}
