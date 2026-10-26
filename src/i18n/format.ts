import type { Locale } from "./config";

const UNITS = {
  en: { crore: "crore", lakh: "lakh", sqft: "sq ft" },
  ta: { crore: "கோடி", lakh: "லட்சம்", sqft: "ச.அடி" },
} as const;
const INTL: Record<Locale, string> = { en: "en-IN", ta: "ta-IN" };

const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

/** Locale-aware formatting. Numerals stay Western (as used on Indian property documents). */
export function makeFormat(locale: Locale) {
  const u = UNITS[locale];
  const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  return {
    price(amount: number) {
      if (amount >= 1_00_00_000) return `₹${trim(amount / 1_00_00_000)} ${u.crore}`;
      if (amount >= 1_00_000) return `₹${trim(amount / 1_00_000)} ${u.lakh}`;
      return `₹${num.format(amount)}`;
    },
    rupees: (amount: number) => `₹${num.format(amount)}`,
    area: (sqft: number) => `${num.format(Math.round(sqft))} ${u.sqft}`,
    number: (n: number) => num.format(n),
    date: (d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
      new Intl.DateTimeFormat(INTL[locale], { timeZone: "Asia/Kolkata", ...opts }).format(new Date(d)),
    dateTime: (d: Date | string) => new Intl.DateTimeFormat(INTL[locale], { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(d)),
  };
}
export type Format = ReturnType<typeof makeFormat>;
