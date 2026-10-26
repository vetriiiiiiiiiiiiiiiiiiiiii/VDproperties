import { NextResponse } from "next/server";
import { isLocale, LOCALE_HEADER, localePath } from "@/i18n/config";

/** Turns the checkbox selection into a shareable ?ids= comparison URL. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = url.searchParams.getAll("id").filter((s) => /^[a-z0-9]{10,40}$/.test(s)).slice(0, 4);
  const lang = req.headers.get(LOCALE_HEADER);
  return NextResponse.redirect(new URL(localePath(isLocale(lang) ? lang : "en", `/account/compare${ids.length ? `?ids=${ids.join(",")}` : ""}`), url), 303);
}
