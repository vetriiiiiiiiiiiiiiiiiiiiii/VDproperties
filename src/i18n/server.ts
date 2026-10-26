import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_HEADER, localePath, type Locale } from "./config";
import { DICTS } from "./dict";
import { makeFormat } from "./format";
import { translateMessage } from "./messages";
import { runAction, type ActionResult } from "@/lib/admin";

/** The locale of the current request, set by the middleware from the URL. */
export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await headers()).get(LOCALE_HEADER);
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: DICTS[locale], href: (p: string) => localePath(locale, p), f: makeFormat(locale) };
}

/** hreflang alternates + canonical for a path in the current locale. */
export async function alternates(path: string) {
  const locale = await getLocale();
  return { canonical: localePath(locale, path), languages: { "en-IN": path, "ta-IN": localePath("ta", path), "x-default": path } };
}

/** Customer-facing server-action messages in the request's language. */
export async function actionMessages() {
  return DICTS[await getLocale()].account.messages;
}

/** runAction, with validation and generic messages translated to the request's language. */
export async function runLocalised(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  const r = await runAction(fn);
  const locale = await getLocale();
  if (locale === "en") return r;
  const generic: Record<string, string> = {
    "Please check the highlighted fields.": DICTS[locale].server.checkFields,
    "Something went wrong and the change was not saved.": DICTS[locale].server.failed,
  };
  const tr = (s: string) => generic[s] ?? translateMessage(s, locale);
  return { ...r, message: tr(r.message), errors: r.errors ? Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [k, v && tr(v)])) : r.errors };
}
