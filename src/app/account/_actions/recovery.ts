"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localePath } from "@/i18n/config";
import { DICTS } from "@/i18n/dict";
import { getLocale, runLocalised } from "@/i18n/server";
import { findValidToken, sendPasswordResetLink, sendVerificationLink } from "@/lib/account-links";
import { audit } from "@/lib/audit";
import { clientIp, hashPassword, requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { passwordPolicy } from "@/lib/validation";
import { type ActionResult } from "@/lib/admin";

async function words() {
  return DICTS[await getLocale()].market.auth;
}

/** Always answers the same, so the form can't be used to find out who has an account. */
export async function requestPasswordReset(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const a = await words();
  if (!rateLimit(`reset:${await clientIp()}`, 5, 60 * 60 * 1000).ok) return { ok: false, message: a.tooMany };
  const email = z.email().max(120).safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (email.success && rateLimit(`reset-email:${email.data}`, 3, 60 * 60 * 1000).ok) {
    const user = await db.user.findUnique({ where: { email: email.data }, select: { id: true, email: true, locale: true, active: true } });
    // Not awaited, so response time doesn't reveal whether the account exists.
    if (user?.active) void sendPasswordResetLink(user).catch((e) => console.error("Reset email failed", e));
  }
  return { ok: true, message: a.linkSent };
}

export async function resetPassword(token: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const a = await words();
  const locale = await getLocale();
  let dest: string | null = null;
  const result = await runLocalised(async () => {
    if (!rateLimit(`reset-submit:${await clientIp()}`, 20, 60 * 60 * 1000).ok) return { ok: false, message: a.tooMany };
    const row = await findValidToken(token, "PASSWORD_RESET");
    if (!row) return { ok: false, message: a.invalidLink };
    const parsed = passwordPolicy.safeParse(fd.get("password"));
    if (!parsed.success) {
      const hint = DICTS[locale].account.auth.passwordHint;
      return { ok: false, message: hint, errors: { password: hint } };
    }
    const password = parsed.data;
    // The link arrived by email, so it also proves the address. Every existing session is ended.
    await db.$transaction([
      db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null, emailVerifiedAt: row.user.emailVerifiedAt ?? new Date() } }),
      db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: row.userId } }),
    ]);
    await audit({ actorId: row.userId, action: "user.password_reset", entityType: "User", entityId: row.userId, summary: "Password reset by email link" });
    dest = row.user.role === "CUSTOMER" ? localePath(locale, "/account/login?reset=1") : "/admin/login";
    return { ok: true, message: a.resetDone };
  });
  if (dest) redirect(dest);
  return result;
}

export async function confirmEmail(token: string, _prev: ActionResult | null): Promise<ActionResult> {
  const a = await words();
  const row = await findValidToken(token, "EMAIL_VERIFY");
  if (!row) return { ok: false, message: a.invalidLink };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await audit({ actorId: row.userId, action: "user.email_verified", entityType: "User", entityId: row.userId, summary: "Email confirmed" });
  // No revalidation here: refreshing this page would show the now-used link as invalid.
  return { ok: true, message: a.verified };
}

export async function resendVerification(): Promise<ActionResult> {
  const a = await words();
  return runLocalised(async () => {
    const me = await requireCustomer();
    if (!rateLimit(`verify:${me.id}`, 3, 60 * 60 * 1000).ok) return { ok: false, message: a.tooMany };
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { id: true, email: true, locale: true } });
    await sendVerificationLink(user);
    return { ok: true, message: a.resent };
  });
}

export async function markUpdatesRead() {
  const me = await requireCustomer();
  await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/account", "layout");
}
