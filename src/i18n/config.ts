export const LOCALES = ["en", "ta"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_HEADER = "x-vdp-locale";
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ta: "தமிழ்" };
export const HTML_LANG: Record<Locale, string> = { en: "en-IN", ta: "ta-IN" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Paths that are never localised (admin, APIs, files, metadata routes). */
const UNLOCALISED = /^\/(admin|api|_next|media|documents|buildtrace\/files|icon|apple-icon|opengraph-image|sitemap\.xml|robots\.txt|favicon)/;

/** Adds the locale prefix to an internal path. English is the default and has no prefix. */
export function localePath(locale: Locale, href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || UNLOCALISED.test(href)) return href;
  if (locale === DEFAULT_LOCALE || /^\/ta(?=\/|$|\?)/.test(href)) return href;
  return href === "/" ? `/${locale}` : href.startsWith("/?") ? `/${locale}${href.slice(1)}` : `/${locale}${href}`;
}

/** Removes a locale prefix: "/ta/plots?x" → { locale: "ta", path: "/plots?x" }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/(ta)(?=\/|$|\?)/);
  if (!m) return { locale: DEFAULT_LOCALE, path: pathname || "/" };
  const rest = pathname.slice(m[0].length);
  return { locale: m[1] as Locale, path: rest.startsWith("/") ? rest : `/${rest}` };
}
