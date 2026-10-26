"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { clientIp, createSession, destroySession, getCurrentUser, hashPassword, LOCKOUT_MS, MAX_FAILED_LOGINS, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, nameField, passwordPolicy, phoneField } from "@/lib/validation";
import { type ActionResult } from "@/lib/admin";
import { localePath } from "@/i18n/config";
import { actionMessages, getLocale, runLocalised } from "@/i18n/server";



/** Only same-site relative paths are allowed as post-login destinations. */
async function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return localePath(await getLocale(), s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/admin") ? s : "/account");
}

export async function registerCustomer(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await actionMessages();
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, Number(process.env.REGISTER_RATE_LIMIT ?? 5), 60 * 60 * 1000).ok) return { ok: false, message: m.tooManyAccounts };
  const result = await runLocalised(async () => {
    const input = z
      .object({
        name: nameField,
        email: z.email("Enter a valid email address").max(120).transform((v) => v.toLowerCase()),
        phone: phoneField,
        password: passwordPolicy,
        terms: z.literal("on", { error: "Please accept the terms to create an account" }),
        marketing: z.string().optional(),
      })
      .parse(Object.fromEntries(fd.entries()));
    if (await db.user.findUnique({ where: { email: input.email } })) {
      return { ok: false, message: m.exists, errors: { email: m.already } };
    }
    const user = await db.user.create({
      data: { name: input.name, email: input.email, phone: input.phone, role: "CUSTOMER", passwordHash: await hashPassword(input.password), marketingConsent: input.marketing === "on" },
    });
    await createSession(user.id);
    await audit({ actorId: user.id, action: "customer.registered", entityType: "User", entityId: user.id, summary: "Customer account created", ipAddress: ip });
    return { ok: true, message: "Account created", redirectTo: await safeNext(fd.get("next")) };
  });
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function loginCustomer(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await actionMessages();
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, Number(process.env.LOGIN_RATE_LIMIT ?? 10), 15 * 60 * 1000).ok) return { ok: false, message: m.tooManyLogins };
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: m.wrong };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
  if (!user || !user.active || user.role !== "CUSTOMER") return { ok: false, message: m.wrong };
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, message: m.locked };
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null } });
    return { ok: false, message: m.wrong };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect(await safeNext(fd.get("next")));
}

export async function logoutCustomer() {
  const m = await actionMessages();
  await destroySession();
  redirect(localePath(await getLocale(), "/"));
}

export async function updateAlertConsent(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await actionMessages();
  return runLocalised(async () => {
    const me = await getCurrentUser();
    if (!me || me.role !== "CUSTOMER") return { ok: false, message: m.signInFirst };
    const consent = fd.get("marketing") === "on";
    await db.user.update({ where: { id: me.id }, data: { marketingConsent: consent } });
    if (!consent) await db.savedSearch.updateMany({ where: { userId: me.id }, data: { alertsEnabled: false } });
    return { ok: true, message: consent ? m.alertsOn : m.alertsOff };
  });
}
