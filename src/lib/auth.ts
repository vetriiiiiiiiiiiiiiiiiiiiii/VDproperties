import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { can, isStaff, type Permission } from "./rbac";

export const SESSION_COOKIE = "vdp_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const RENEW_WITHIN_MS = 4 * 60 * 60 * 1000;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

// Compared against when the email is unknown, so response time doesn't reveal which accounts exist.
let dummyHash: string | undefined;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string | null) {
  dummyHash ??= bcrypt.hashSync("not-a-real-password", 12);
  return bcrypt.compare(password, hash ?? dummyHash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt,
      ipAddress: await clientIp(),
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = { id: string; email: string; name: string; role: Role };

/** Validates the session cookie against the database. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now() || !session.user.active) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.expiresAt.getTime() - Date.now() < RENEW_WITHIN_MS) {
    await db.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  }
  const { active: _active, ...user } = session.user;
  return user;
});

/** For pages: redirects to login when signed out, and to the dashboard when the role lacks permission. */
export async function requirePage(permission: Permission = "dashboard:view") {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isStaff(user.role)) redirect("/account");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Not signed in" : "You don't have permission to do that");
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  if (!can(user.role, permission)) throw new AuthError(403);
  return user;
}

/** For customer pages: signed-in customer accounts only. Staff are sent to the admin. */
export async function requireCustomerPage(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  if (isStaff(user.role)) redirect("/admin");
  return user;
}

/** For customer server actions: throws instead of redirecting. */
export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  if (user.role !== "CUSTOMER") throw new AuthError(403);
  return user;
}
