import { isLocale, splitLocale, type Locale } from "./config";
import { DICTS } from "./dict";

/** Picks the visitor's language for an API request: the form's hidden field, else the page it was sent from. */
export function requestLocale(req: Request, body?: unknown): Locale {
  const fromBody = body && typeof body === "object" ? (body as Record<string, unknown>).locale : undefined;
  if (isLocale(fromBody)) return fromBody;
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      return splitLocale(new URL(ref).pathname).locale;
    } catch {}
  }
  return "en";
}

const NUMBERED: [RegExp, (v: Locale, n: number) => string][] = [
  [/^Keep this under (\d+) characters$/, (l, n) => DICTS[l].server.v.tooLong(n)],
  [/^Please choose a date within the next (\d+) days$/, (l, n) => DICTS[l].server.v.within(n)],
];

/**
 * Validation rules are written once, in English; this maps their messages to the visitor's language.
 * Unknown messages pass through unchanged rather than disappearing.
 */
export function translateMessage(message: string, locale: Locale): string {
  if (locale === "en") return message;
  for (const pick of [(d: (typeof DICTS)["en"]) => d.server.v, (d: (typeof DICTS)["en"]) => d.account.messages, (d: (typeof DICTS)["en"]) => d.market.v] as const) {
    const en = pick(DICTS.en) as Record<string, unknown>;
    const key = Object.keys(en).find((k) => en[k] === message);
    if (key) return (pick(DICTS[locale]) as Record<string, unknown>)[key] as string;
  }
  for (const [re, fn] of NUMBERED) {
    const m = message.match(re);
    if (m) return fn(locale, Number(m[1]));
  }
  return message;
}

export function translateErrors(errors: Record<string, string>, locale: Locale) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, translateMessage(v, locale)]));
}
