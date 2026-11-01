import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { absoluteUrl } from "./site";

/** Tests point this at a local stand-in for Google. Never set it in production. */
const testBase = () => process.env.GOOGLE_OAUTH_TEST_BASE || "";
const authUrl = () => (testBase() ? `${testBase()}/authorize` : "https://accounts.google.com/o/oauth2/v2/auth");
const tokenUrl = () => (testBase() ? `${testBase()}/token` : "https://oauth2.googleapis.com/token");

export const GOOGLE_COOKIE = "vdp_google_oauth";
export const GOOGLE_COOKIE_PATH = "/api/auth/google";
const redirectUri = () => absoluteUrl("/api/auth/google/callback");

export function isGoogleConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export type GoogleFlow = { state: string; nonce: string; verifier: string; next: string; locale: Locale };

/** Only same-site paths outside the admin are allowed after sign-in. */
export function safeNextPath(next: string | null | undefined, locale: Locale) {
  const n = next ?? "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") && !n.startsWith("/admin") ? n : localePath(locale, "/account");
}

export function startFlow(next: string | null, lang: string | null) {
  const locale: Locale = isLocale(lang) ? lang : "en";
  const flow: GoogleFlow = {
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    next: safeNextPath(next, locale),
    locale,
  };
  const url = new URL(authUrl());
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash("sha256").update(flow.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { flow, url: url.toString() };
}

export function readFlow(cookie: string | undefined): GoogleFlow | null {
  if (!cookie) return null;
  try {
    const f = JSON.parse(Buffer.from(cookie, "base64url").toString()) as GoogleFlow;
    return f.state && f.nonce && f.verifier && isLocale(f.locale) ? { ...f, next: safeNextPath(f.next, f.locale) } : null;
  } catch {
    return null;
  }
}

export type GoogleIdentity = { sub: string; email: string; emailVerified: boolean; name: string };

/**
 * Checks an ID token's claims. It arrives straight from Google's token endpoint over TLS, which
 * OpenID Connect accepts in place of checking the signature; issuer, audience, expiry and nonce are still verified.
 */
export function parseIdToken(idToken: string, expected: { clientId: string; nonce: string; issuers: string[]; now?: number }): GoogleIdentity | null {
  try {
    const c = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()) as Record<string, unknown>;
    const now = (expected.now ?? Date.now()) / 1000;
    if (!expected.issuers.includes(String(c.iss)) || c.aud !== expected.clientId || c.nonce !== expected.nonce) return null;
    if (typeof c.exp !== "number" || c.exp < now) return null;
    if (typeof c.sub !== "string" || !c.sub || typeof c.email !== "string" || !c.email) return null;
    return {
      sub: c.sub,
      email: c.email.toLowerCase(),
      emailVerified: c.email_verified === true || c.email_verified === "true",
      name: typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 80) : c.email.split("@")[0].slice(0, 80),
    };
  } catch {
    return null;
  }
}

/** Swaps the one-time code for the signed-in person's identity. Returns null on any failure. */
export async function exchangeCode(code: string, flow: GoogleFlow) {
  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) return null;
  return parseIdToken(body.id_token, {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    nonce: flow.nonce,
    issuers: testBase() ? [testBase()] : ["https://accounts.google.com", "accounts.google.com"],
  });
}
