import { NextResponse } from "next/server";

/** Turns the checkbox selection into a shareable ?ids= comparison URL. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = url.searchParams.getAll("id").filter((s) => /^[a-z0-9]{10,40}$/.test(s)).slice(0, 4);
  return NextResponse.redirect(new URL(`/account/compare${ids.length ? `?ids=${ids.join(",")}` : ""}`, url), 303);
}
