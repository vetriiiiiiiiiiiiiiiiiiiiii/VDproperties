import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { localePath } from "@/i18n/config";
import { audit } from "@/lib/audit";
import { clientIp, createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeCode, GOOGLE_COOKIE, GOOGLE_COOKIE_PATH, isGoogleConfigured, readFlow, type GoogleFlow, type GoogleIdentity } from "@/lib/google-auth";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Outcome = { userId: string } | { error: "staff" | "unverified" | "failed" };

/** A password nobody knows, for accounts that only use Google. They can set a real one with "Forgot your password?". */
const unusablePassword = () => hashPassword(randomBytes(32).toString("base64url"));

async function resolveUser(g: GoogleIdentity, flow: GoogleFlow): Promise<Outcome> {
  const known = await db.user.findUnique({ where: { googleId: g.sub }, select: { id: true, role: true, active: true } });
  if (known) {
    if (known.role !== "CUSTOMER") return { error: "staff" };
    return known.active ? { userId: known.id } : { error: "failed" };
  }
  if (!g.emailVerified) return { error: "unverified" };

  const existing = await db.user.findUnique({ where: { email: g.email }, select: { id: true, role: true, active: true, googleId: true, emailVerifiedAt: true } });
  if (existing) {
    // Staff never sign in with Google, so a Google account can't open the admin.
    if (existing.role !== "CUSTOMER") return { error: "staff" };
    if (!existing.active || existing.googleId) return { error: "failed" };
    // If the address was never confirmed, someone else may have registered it to wait for its owner:
    // Google has now proved who owns it, so that password and any sessions stop working.
    const unconfirmed = !existing.emailVerifiedAt;
    await db.user.update({
      where: { id: existing.id },
      data: { googleId: g.sub, emailVerifiedAt: existing.emailVerifiedAt ?? new Date(), ...(unconfirmed && { passwordHash: await unusablePassword() }) },
    });
    if (unconfirmed) await db.session.deleteMany({ where: { userId: existing.id } });
    await audit({ actorId: existing.id, action: "customer.google_linked", entityType: "User", entityId: existing.id, summary: "Google sign-in linked" });
    return { userId: existing.id };
  }

  const user = await db.user.create({
    data: { name: g.name, email: g.email, role: "CUSTOMER", googleId: g.sub, emailVerifiedAt: new Date(), locale: flow.locale, passwordHash: await unusablePassword() },
  });
  await audit({ actorId: user.id, action: "customer.registered", entityType: "User", entityId: user.id, summary: "Customer account created with Google" });
  return { userId: user.id };
}

export async function GET(req: Request) {
  const jar = await cookies();
  const flow = readFlow(jar.get(GOOGLE_COOKIE)?.value);
  const params = new URL(req.url).searchParams;
  const fail = (error: string) => {
    const res = NextResponse.redirect(absoluteUrl(localePath(flow?.locale ?? "en", `/account/login?error=google-${error}`)), 303);
    res.cookies.set(GOOGLE_COOKIE, "", { path: GOOGLE_COOKIE_PATH, maxAge: 0 });
    return res;
  };
  try {
    const code = params.get("code");
    // The state must match the cookie from this browser, which stops forged sign-in links.
    if (!isGoogleConfigured() || !flow || !code || params.get("state") !== flow.state) return fail("failed");
    if (!rateLimit(`google:${await clientIp()}`, 30, 15 * 60 * 1000).ok) return fail("failed");
    const identity = await exchangeCode(code, flow);
    if (!identity) return fail("failed");
    const outcome = await resolveUser(identity, flow);
    if ("error" in outcome) return fail(outcome.error);
    await db.user.update({ where: { id: outcome.userId }, data: { lastLoginAt: new Date(), locale: flow.locale, failedLogins: 0, lockedUntil: null } });
    await createSession(outcome.userId);
    const res = NextResponse.redirect(absoluteUrl(flow.next), 303);
    res.cookies.set(GOOGLE_COOKIE, "", { path: GOOGLE_COOKIE_PATH, maxAge: 0 });
    return res;
  } catch (err) {
    console.error("Google sign-in failed", err);
    return fail("failed");
  }
}
