"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DICTS } from "@/i18n/dict";
import { getLocale, runLocalised } from "@/i18n/server";
import { translateMessage } from "@/i18n/messages";
import { audit } from "@/lib/audit";
import { clientIp, requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyNewLead } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { submissionFingerprint } from "@/lib/spam";
import { checkVisitDate, nameField, phoneField, todayInIndia } from "@/lib/validation";
import { formObject, type ActionResult } from "@/lib/admin";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const purchaseSchema = z.object({
  name: nameField,
  phone: phoneField,
  offerAmount: z.preprocess(blank, z.coerce.number({ error: "Enter a number" }).positive("Enter a positive number").max(1e11).optional()),
  funding: z.enum(["OWN_FUNDS", "HOME_LOAN", "BOTH", "UNDECIDED"]),
  timeline: z.preprocess(blank, z.string().trim().max(60).optional()),
  mode: z.enum(["SITE_VISIT", "OFFICE", "VIDEO_CALL"]),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a preferred date"),
  timeSlot: z.enum(["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]),
  message: z.preprocess(blank, z.string().trim().max(1000, "Keep this under 1000 characters").optional()),
  consent: z.literal(true, { error: "Please confirm we may contact you about this request" }),
});

/** A signed-in buyer asks to buy a listed property and proposes an appointment. Nothing is paid online. */
export async function requestPurchase(propertyId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = await getLocale();
  const b = DICTS[locale].market.buy;
  return runLocalised(async () => {
    const me = await requireCustomer();
    if (!rateLimit(`purchase:${await clientIp()}`, 8, 60 * 60 * 1000).ok) return { ok: false, message: DICTS[locale].market.msg.tooMany };
    const raw = formObject(fd);
    const input = purchaseSchema.parse({ ...raw, consent: raw.consent === "on" || raw.consent === "true" });
    const p = await db.property.findFirst({
      where: { id: propertyId, publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } },
      select: { id: true, referenceCode: true, title: true, sellerId: true },
    });
    if (!p) return { ok: false, message: b.unavailable };
    if (p.sellerId === me.id) return { ok: false, message: b.own };

    const s = await getSettings();
    const dateError = checkVisitDate(input.preferredDate, todayInIndia(), { closedWeekdays: s.visitClosedWeekdays, blackoutDates: s.visitBlackoutDates });
    if (dateError) {
      const msg = translateMessage(dateError, locale);
      return { ok: false, message: msg, errors: { preferredDate: msg } };
    }
    const open = await db.purchaseRequest.count({ where: { buyerId: me.id, propertyId: p.id, status: { notIn: ["CLOSED", "COMPLETED"] } } });
    if (open) return { ok: false, message: b.duplicate };

    const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { email: true } });
    const req = await db.purchaseRequest.create({
      data: {
        propertyId: p.id,
        propertyLabel: `${p.referenceCode} · ${p.title}`,
        buyerId: me.id,
        name: input.name,
        phone: input.phone,
        email: user.email,
        offerAmount: input.offerAmount ? BigInt(Math.round(input.offerAmount)) : null,
        funding: input.funding,
        timeline: input.timeline ?? null,
        mode: input.mode,
        preferredDate: new Date(`${input.preferredDate}T00:00:00Z`),
        timeSlot: input.timeSlot,
        message: input.message ?? null,
        consent: true,
        fingerprint: submissionFingerprint(["purchase", me.id, p.id]),
      },
    });
    await db.user.update({ where: { id: me.id }, data: { phone: input.phone } });
    await audit({ actorId: me.id, action: "purchase.requested", entityType: "PurchaseRequest", entityId: req.id, summary: `Purchase request for ${p.referenceCode}` });
    await notifyNewLead("purchase request", `${p.referenceCode} · ${p.title}`, `/admin/purchases/${req.id}`);
    revalidatePath("/account");
    return { ok: true, message: b.ok };
  });
}
