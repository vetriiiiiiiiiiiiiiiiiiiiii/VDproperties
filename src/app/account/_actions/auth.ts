"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { clientIp, createSession, destroySession, getCurrentUser, hashPassword, LOCKOUT_MS, MAX_FAILED_LOGINS, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, nameField, passwordPolicy, phoneField } from "@/lib/validation";
import { runAction, type ActionResult } from "@/lib/admin";

const GENERIC = "Incorrect email or password.";

/** Only same-site relative paths are allowed as post-login destinations. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/admin") ? s : "/account";
}

export async function registerCustomer(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, Number(process.env.REGISTER_RATE_LIMIT ?? 5), 60 * 60 * 1000).ok) return { ok: false, message: "Too many accounts created from this connection. Try again later." };
  const result = await runAction(async () => {
    const input = z
      .object({
        name: nameField,
        email: z.email("Enter a valid email").max(120).transform((v) => v.toLowerCase()),
        phone: phoneField,
        password: passwordPolicy,
        terms: z.literal("on", { error: "Please accept the terms to create an account" }),
        marketing: z.string().optional(),
      })
      .parse(Object.fromEntries(fd.entries()));
    if (await db.user.findUnique({ where: { email: input.email } })) {
      return { ok: false, message: "An account with this email already exists. Sign in instead.", errors: { email: "Already registered" } };
    }
    const user = await db.user.create({
      data: { name: input.name, email: input.email, phone: input.phone, role: "CUSTOMER", passwordHash: await hashPassword(input.password), marketingConsent: input.marketing === "on" },
    });
    await createSession(user.id);
    await audit({ actorId: user.id, action: "customer.registered", entityType: "User", entityId: user.id, summary: "Customer account created", ipAddress: ip });
    return { ok: true, message: "Account created", redirectTo: safeNext(fd.get("next")) };
  });
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function loginCustomer(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, Number(process.env.LOGIN_RATE_LIMIT ?? 10), 15 * 60 * 1000).ok) return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes." };
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: GENERIC };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
  if (!user || !user.active || user.role !== "CUSTOMER") return { ok: false, message: GENERIC };
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, message: "This account is temporarily locked. Try again in 15 minutes." };
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null } });
    return { ok: false, message: GENERIC };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logoutCustomer() {
  await destroySession();
  redirect("/");
}

export async function updateAlertConsent(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await getCurrentUser();
    if (!me || me.role !== "CUSTOMER") return { ok: false, message: "Sign in first" };
    const consent = fd.get("marketing") === "on";
    await db.user.update({ where: { id: me.id }, data: { marketingConsent: consent } });
    if (!consent) await db.savedSearch.updateMany({ where: { userId: me.id }, data: { alertsEnabled: false } });
    return { ok: true, message: consent ? "You'll receive alerts for saved searches you switch on." : "Alerts are off. We won't email you about new listings." };
  });
}
