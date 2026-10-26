"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { LOCKOUT_MS, MAX_FAILED_LOGINS, clientIp, createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, passwordPolicy } from "@/lib/validation";
import { runAction, type ActionResult } from "@/lib/admin";
import { z } from "zod";

const GENERIC = "Incorrect email or password.";

export async function login(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, Number(process.env.LOGIN_RATE_LIMIT ?? 10), 15 * 60 * 1000).ok) return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: GENERIC };
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !user.active) return { ok: false, message: GENERIC };
  // Customer accounts sign in on the customer page and never reach the staff admin.
  if (user.role === "CUSTOMER") return { ok: false, message: GENERIC };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, message: "This account is temporarily locked after repeated failed attempts. Try again in 15 minutes." };
  }
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null },
    });
    if (failed >= MAX_FAILED_LOGINS) await audit({ actorId: user.id, action: "user.locked", entityType: "User", entityId: user.id, summary: "Account locked after failed sign-ins", ipAddress: ip });
    return { ok: false, message: GENERIC };
  }

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit({ actorId: user.id, action: "user.login", entityType: "User", entityId: user.id, summary: "Signed in", ipAddress: ip });
  redirect("/admin");
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ actorId: user.id, action: "user.logout", entityType: "User", entityId: user.id, summary: "Signed out" });
  redirect("/admin/login");
}

export async function changeOwnPassword(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await getCurrentUser();
    if (!me) return { ok: false, message: "Not signed in" };
    const input = z
      .object({ current: z.string().min(1, "Enter your current password"), next: passwordPolicy, confirm: z.string() })
      .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
      .parse({ current: fd.get("current"), next: fd.get("next"), confirm: fd.get("confirm") });
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(input.current, user.passwordHash))) return { ok: false, message: "Current password is incorrect.", errors: { current: "Incorrect password" } };
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(input.next) } });
    // Sign out other sessions after a password change.
    await db.session.deleteMany({ where: { userId: me.id } });
    await createSession(me.id);
    await audit({ actorId: me.id, action: "user.password_changed", entityType: "User", entityId: me.id, summary: "Changed own password" });
    return { ok: true, message: "Password updated. Other sessions have been signed out." };
  });
}
