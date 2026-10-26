import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast path only: bounces requests without a session cookie away from /admin.
 * Real authentication and authorisation happen on the server in every admin page, action and route.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.get("vdp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
