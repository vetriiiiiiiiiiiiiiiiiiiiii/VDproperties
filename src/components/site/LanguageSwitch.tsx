"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { LOCALE_NAMES, localePath, splitLocale, type Locale } from "@/i18n/config";

/** EN | தமிழ் toggle that keeps the current page, filters and anchors. */
export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [suffix, setSuffix] = useState("");
  useEffect(() => setSuffix(window.location.search + window.location.hash), [pathname]);
  const { path } = splitLocale(pathname);
  const target = (l: Locale) => localePath(l, path) + suffix;
  return (
    <div role="group" aria-label={t.language} className={`relative flex items-center rounded-full p-0.5 text-xs font-semibold ${dark ? "bg-ivory/10" : "bg-navy/5"}`}>
      {(["en", "ta"] as const).map((l) => (
        <a
          key={l}
          href={target(l)}
          hrefLang={l === "en" ? "en-IN" : "ta-IN"}
          lang={l === "en" ? "en-IN" : "ta-IN"}
          aria-current={locale === l ? "true" : undefined}
          className={`relative z-10 rounded-full px-2.5 py-1.5 transition-colors duration-300 ${locale === l ? (dark ? "bg-ivory text-forest" : "bg-forest text-ivory") : dark ? "text-ivory/80 hover:text-ivory" : "text-navy/70 hover:text-navy"}`}
        >
          {l === "en" ? "EN" : LOCALE_NAMES.ta}
        </a>
      ))}
    </div>
  );
}
