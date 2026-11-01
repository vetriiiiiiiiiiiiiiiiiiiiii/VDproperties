import { NextResponse } from "next/server";
import { GOOGLE_COOKIE, GOOGLE_COOKIE_PATH, isGoogleConfigured, startFlow } from "@/lib/google-auth";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  if (!isGoogleConfigured()) return NextResponse.redirect(absoluteUrl("/account/login"), 303);
  const { flow, url } = startFlow(params.get("next"), params.get("lang"));
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(GOOGLE_COOKIE, Buffer.from(JSON.stringify(flow)).toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: GOOGLE_COOKIE_PATH,
    maxAge: 600,
  });
  return res;
}
