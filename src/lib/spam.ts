import { createHash } from "node:crypto";

export const MIN_FILL_MS = 2500;
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** Returns a reason if the submission looks automated. */
export function spamReason(input: { company_website?: string; startedAt: number }, now = Date.now()) {
  if (input.company_website) return "honeypot";
  const age = now - input.startedAt;
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > MAX_FORM_AGE_MS) return "stale-form";
  return null;
}

const URL_RE = /https?:\/\/|www\./gi;

/** Messages stuffed with links are almost always spam. */
export function looksLikeLinkSpam(text?: string) {
  if (!text) return false;
  return (text.match(URL_RE)?.length ?? 0) >= 3;
}

/** Stable key used to detect a repeated submission of the same request. */
export function submissionFingerprint(parts: (string | undefined | null)[]) {
  return createHash("sha256")
    .update(parts.map((p) => (p ?? "").toLowerCase().replace(/\s+/g, "")).join("|"))
    .digest("hex")
    .slice(0, 40);
}

/** IPs are stored hashed so they can be used for abuse checks without keeping the raw address. */
export function hashIp(ip: string) {
  return createHash("sha256").update(`vdp:${ip}`).digest("hex").slice(0, 32);
}
