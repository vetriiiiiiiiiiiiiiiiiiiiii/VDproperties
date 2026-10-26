"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localePath } from "@/i18n/config";
import { DICTS } from "@/i18n/dict";
import { getLocale, runLocalised } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { clientIp, requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { HOME_TYPES } from "@/lib/labels";
import {
  logSubmission,
  MAX_OPEN_SUBMISSIONS,
  nextReferenceCode,
  SELLER_EDITABLE,
  SELLER_OPEN,
  sellerListingSchema,
  uniquePropertySlug,
  type SellerListingInput,
} from "@/lib/listings";
import { notifyNewLead } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { deleteStored } from "@/lib/storage";
import { formObject, type ActionResult } from "@/lib/admin";

async function msgs() {
  return DICTS[await getLocale()].market.msg;
}

function parse(fd: FormData) {
  const raw = formObject(fd);
  return sellerListingSchema.parse({ ...raw, declaration: raw.declaration === "on" || raw.declaration === "true" });
}

/** Maps the seller's form onto property fields. The asking price stays private ("Contact for price") until staff decide. */
function propertyFields(input: SellerListingInput) {
  const home = HOME_TYPES.includes(input.type);
  return {
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    locationId: input.locationId ?? null,
    sellerLocationText: input.sellerLocationText ?? null,
    localityLabel: input.localityLabel ?? null,
    sellerAddress: input.sellerAddress,
    landAreaSqft: input.landAreaSqft ?? null,
    plotDimensions: input.plotDimensions ?? null,
    facing: input.facing ?? null,
    builtUpAreaSqft: home ? (input.builtUpAreaSqft ?? null) : null,
    bedrooms: home ? (input.bedrooms ?? null) : null,
    bathrooms: home ? (input.bathrooms ?? null) : null,
    floors: home ? (input.floors ?? null) : null,
    primaryAreaSqft: home ? (input.builtUpAreaSqft ?? input.landAreaSqft ?? null) : (input.landAreaSqft ?? null),
    accessRoad: input.accessRoad ?? null,
    approvalInfo: input.approvalInfo ?? null,
    priceAmount: input.expectedPrice ? BigInt(Math.round(input.expectedPrice)) : null,
    priceDisplay: "CONTACT_FOR_PRICE" as const,
    publicPrice: null,
    sellerRelation: input.sellerRelation,
  };
}

async function locationOk(id?: string) {
  return !id || !!(await db.location.findUnique({ where: { id }, select: { id: true } }));
}

async function ownListing(sellerId: string, id: string) {
  return db.property.findFirst({ where: { id, sellerId, source: "OWNER" }, select: { id: true, referenceCode: true, title: true, submissionStatus: true } });
}

export async function createListing(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await msgs();
  const locale = await getLocale();
  let created: string | null = null;
  const result = await runLocalised(async () => {
    const me = await requireCustomer();
    if (!rateLimit(`listing:${await clientIp()}`, 10, 60 * 60 * 1000).ok) return { ok: false, message: m.tooMany };
    const open = await db.property.count({ where: { sellerId: me.id, submissionStatus: { in: SELLER_OPEN } } });
    if (open >= MAX_OPEN_SUBMISSIONS) return { ok: false, message: m.limit(MAX_OPEN_SUBMISSIONS) };
    const input = parse(fd);
    if (!(await locationOk(input.locationId))) return { ok: false, message: m.unknownLocation, errors: { locationId: m.unknownLocation } };
    const referenceCode = await nextReferenceCode();
    const p = await db.property.create({
      data: {
        ...propertyFields(input),
        referenceCode,
        slug: await uniquePropertySlug(slugify(input.title)),
        source: "OWNER",
        sellerId: me.id,
        submissionStatus: "SUBMITTED",
        submittedAt: new Date(),
        publication: "DRAFT",
      },
    });
    await db.user.update({ where: { id: me.id }, data: { phone: input.phone, name: input.name } });
    await logSubmission(p.id, { actorId: me.id, status: "SUBMITTED" });
    await audit({ actorId: me.id, action: "listing.submitted", entityType: "Property", entityId: p.id, summary: `${referenceCode} · ${p.title} submitted by owner` });
    await notifyNewLead("owner property submission", `${referenceCode} · ${p.title}`, `/admin/submissions/${p.id}`);
    created = p.id;
    return { ok: true, message: m.created };
  });
  if (created) redirect(localePath(locale, `/account/listings/${created}?created=1`));
  return result;
}

export async function updateListing(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await msgs();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const p = await ownListing(me.id, id);
    if (!p) return { ok: false, message: m.notFound };
    if (!p.submissionStatus || !SELLER_EDITABLE.includes(p.submissionStatus)) return { ok: false, message: m.locked };
    const input = parse(fd);
    if (!(await locationOk(input.locationId))) return { ok: false, message: m.unknownLocation, errors: { locationId: m.unknownLocation } };
    const resubmit = p.submissionStatus === "CHANGES_REQUESTED";
    await db.property.update({ where: { id }, data: { ...propertyFields(input), ...(resubmit && { submissionStatus: "SUBMITTED" }) } });
    await db.user.update({ where: { id: me.id }, data: { phone: input.phone, name: input.name } });
    await logSubmission(id, { actorId: me.id, status: resubmit ? "SUBMITTED" : null, message: resubmit ? "Updated and sent back for review" : "Details updated" });
    await audit({ actorId: me.id, action: "listing.updated", entityType: "Property", entityId: id, summary: `${p.referenceCode} updated by owner` });
    revalidatePath("/", "layout");
    return { ok: true, message: resubmit ? m.resubmitted : m.updated };
  });
}

export async function withdrawListing(id: string): Promise<ActionResult> {
  const m = await msgs();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const p = await ownListing(me.id, id);
    if (!p) return { ok: false, message: m.notFound };
    if (!p.submissionStatus || !SELLER_OPEN.includes(p.submissionStatus)) return { ok: false, message: m.locked };
    await db.property.update({ where: { id }, data: { submissionStatus: "WITHDRAWN", publication: "DRAFT" } });
    await logSubmission(id, { actorId: me.id, status: "WITHDRAWN" });
    await audit({ actorId: me.id, action: "listing.withdrawn", entityType: "Property", entityId: id, summary: `${p.referenceCode} withdrawn by owner` });
    revalidatePath("/", "layout");
    return { ok: true, message: m.withdrawn };
  });
}

/** Sellers may remove their own photos or documents while the listing is still editable. */
export async function removeListingFile(kind: "image" | "document", fileId: string): Promise<ActionResult> {
  const m = await msgs();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const file =
      kind === "image"
        ? await db.propertyImage.findUnique({ where: { id: fileId }, select: { id: true, url: true, property: { select: { sellerId: true, submissionStatus: true } } } })
        : await db.propertyDocument.findUnique({ where: { id: fileId }, select: { id: true, url: true, property: { select: { sellerId: true, submissionStatus: true } } } });
    if (!file || file.property.sellerId !== me.id) return { ok: false, message: m.notFound };
    if (!file.property.submissionStatus || !SELLER_EDITABLE.includes(file.property.submissionStatus)) return { ok: false, message: m.locked };
    if (kind === "image") await db.propertyImage.delete({ where: { id: fileId } });
    else await db.propertyDocument.delete({ where: { id: fileId } });
    await deleteStored(file.url);
    revalidatePath("/", "layout");
    return { ok: true, message: m.removed };
  });
}
