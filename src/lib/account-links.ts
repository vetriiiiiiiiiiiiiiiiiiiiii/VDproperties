import "server-only";
import { randomBytes } from "node:crypto";
import type { AuthTokenKind } from "@prisma/client";
import { localePath, isLocale } from "@/i18n/config";
import { DICTS } from "@/i18n/dict";
import { hashToken } from "./auth";
import { db } from "./db";
import { isMailConfigured, sendMail } from "./mail";
import { absoluteUrl } from "./site";

const TTL_MS: Record<AuthTokenKind, number> = { PASSWORD_RESET: 60 * 60 * 1000, EMAIL_VERIFY: 3 * 24 * 60 * 60 * 1000 };

/** Issues a one-time token, replacing earlier ones of the same kind. Only its hash is stored. */
async function issueToken(userId: string, kind: AuthTokenKind) {
  const token = randomBytes(32).toString("base64url");
  await db.authToken.deleteMany({ where: { userId, kind } });
  await db.authToken.create({ data: { userId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL_MS[kind]) } });
  return token;
}

/** Finds a token that is unused and unexpired, and whose account is active. */
export async function findValidToken(token: string, kind: AuthTokenKind) {
  if (!token || token.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, email: true, role: true, active: true, emailVerifiedAt: true } } } });
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt < new Date() || !row.user.active) return null;
  return row;
}

type LinkUser = { id: string; email: string; locale: string };

export async function sendPasswordResetLink(user: LinkUser) {
  const locale = isLocale(user.locale) ? user.locale : "en";
  const a = DICTS[locale].market.auth;
  const token = await issueToken(user.id, "PASSWORD_RESET");
  return sendMail(user.email, a.mailResetSubject, a.mailReset(absoluteUrl(localePath(locale, `/account/reset?token=${token}`))));
}

export async function sendVerificationLink(user: LinkUser) {
  const locale = isLocale(user.locale) ? user.locale : "en";
  const a = DICTS[locale].market.auth;
  const token = await issueToken(user.id, "EMAIL_VERIFY");
  return sendMail(user.email, a.mailVerifySubject, a.mailVerify(absoluteUrl(localePath(locale, `/account/verify?token=${token}`))));
}

/**
 * Listing a property or asking to buy needs a confirmed email, but only once email can actually be
 * sent: without a provider nobody could ever confirm.
 */
export async function needsEmailVerification(userId: string) {
  if (!isMailConfigured()) return false;
  const u = await db.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  return !u?.emailVerifiedAt;
}
