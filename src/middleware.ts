import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_HEADER, splitLocale } from "@/i18n/config";

/**
 * 1. Language routing: /ta/... is served by the same pages with the locale passed in a request
 *    header; English is the default with no prefix (/en/... redirects to the bare path).
 * 2. Fast path for /admin: bounces requests without a session cookie. Real authorisation
 *    happens on the server in every admin page, action and route.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname !== "/admin/login" && !req.cookies.get("vdp_session")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const { locale, path } = splitLocale(pathname);
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  headers.set("x-vdp-path", path);
  if (locale !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|media|documents|buildtrace/files|icon|apple-icon|opengraph-image|sitemap.xml|robots.txt|brand|.*\\.(?:png|jpg|svg|webp|ico|txt|xml)$).*)"],
};
