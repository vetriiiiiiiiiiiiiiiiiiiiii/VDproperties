import { NextResponse } from "next/server";

/** Adds a property to the comparison list in the URL (works without JavaScript). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const list = (url.searchParams.get("p") ?? "").split(",").filter((s) => /^[a-z0-9-]{1,80}$/.test(s));
  const add = url.searchParams.get("add") ?? "";
  if (/^[a-z0-9-]{1,80}$/.test(add) && !list.includes(add)) list.push(add);
  return NextResponse.redirect(new URL(`/compare?p=${list.slice(0, 4).join(",")}`, url), 303);
}
