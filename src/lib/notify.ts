import "server-only";
import type { NotificationKind } from "@prisma/client";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { DICTS, type Dict } from "@/i18n/dict";
import { makeFormat, type Format } from "@/i18n/format";
import { db } from "./db";
import { sendMail } from "./mail";
import { absoluteUrl } from "./site";

/**
 * Tells a customer about a change, in their own language: always in their account, and by email
 * when email is configured. Never throws, because the staff action that caused it has already been saved.
 */
export async function notifyCustomer(
  userId: string | null | undefined,
  kind: NotificationKind,
  path: string,
  build: (t: Dict, f: Format, locale: Locale) => { title: string; body?: string | null },
) {
  if (!userId) return;
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, locale: true, role: true, active: true } });
    if (!user || user.role !== "CUSTOMER" || !user.active) return;
    const locale: Locale = isLocale(user.locale) ? user.locale : "en";
    const t = DICTS[locale];
    const { title, body } = build(t, makeFormat(locale), locale);
    const n = await db.notification.create({ data: { userId, kind, title: title.slice(0, 200), body: body?.slice(0, 2000) ?? null, path } });
    const text = `${title}\n\n${body ? `${body}\n\n` : ""}${t.market.updates.mailFooter(absoluteUrl(localePath(locale, path)))}`;
    if (await sendMail(user.email, title, text)) await db.notification.update({ where: { id: n.id }, data: { emailedAt: new Date() } });
  } catch (err) {
    console.error("Customer notification failed", err);
  }
}
