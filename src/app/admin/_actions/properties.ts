"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { HOME_TYPES } from "@/lib/labels";
import { deleteStored } from "@/lib/storage";
import { alertSavedSearches } from "@/lib/alerts";
import { formatPrice } from "@/lib/format";
import { recordActivity } from "@/lib/platform";
import { nextReferenceCode, uniquePropertySlug as uniqueSlug } from "@/lib/listings";
import { checkbox, formObject, nullify, optHttpsUrl, optId, optInt, optLongText, optNum, optStr, runAction, type ActionResult } from "@/lib/admin";

const propertySchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(140),
  slug: z.preprocess((v) => (typeof v === "string" && v.trim() ? slugify(v) : undefined), z.string().min(3).max(80).optional()),
  referenceCode: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
    z.string().regex(/^[A-Z0-9-]{3,20}$/, "Use letters, numbers and dashes").optional(),
  ),
  type: z.enum(["RESIDENTIAL_PLOT", "LAND", "HOUSE", "VILLA"]),
  availability: z.enum(["AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE"]),
  featured: checkbox,
  summary: optStr(300),
  description: optLongText(),
  locationId: optId,
  localityLabel: optStr(140),
  latitude: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(-90).max(90).optional()),
  longitude: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(-180).max(180).optional()),
  showExactLocation: checkbox,
  mapUrl: optHttpsUrl,
  priceAmount: optNum(1e12),
  priceDisplay: z.enum(["SHOW_PRICE", "CONTACT_FOR_PRICE"]),
  priceNote: optStr(120),
  landAreaSqft: optNum(1e9),
  landAreaLabel: optStr(60),
  plotDimensions: optStr(60),
  facing: optStr(40),
  builtUpAreaSqft: optNum(1e8),
  bedrooms: optInt(50),
  bathrooms: optInt(50),
  floors: optInt(100),
  accessRoad: optStr(160),
  utilities: optLongText(4000),
  developmentStatus: optStr(160),
  constructionSpecs: optLongText(8000),
  approvalInfo: optLongText(4000),
  projectId: optId,
  seoTitle: optStr(70),
  seoDescription: optStr(170),
  amenityIds: z.array(z.string().max(40)).max(60),
  isSample: checkbox,
  intent: z.enum(["save", "publish", "unpublish"]).default("save"),
});

export async function saveProperty(id: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("properties:manage");
    const input = propertySchema.parse(formObject(fd, ["amenityIds"]));
    const existing = id ? await db.property.findUnique({ where: { id }, select: { publication: true, publishedAt: true, title: true, publicPrice: true, availability: true, source: true, submissionStatus: true, featured: true } }) : null;
    if (id && !existing) return { ok: false, message: "This property no longer exists." };
    // Staff prepare drafts; only admins change what's live, featured or for sale.
    const canPublish = can(user.role, "properties:publish");
    if (input.intent !== "save" && !canPublish) return { ok: false, message: "Only an Admin can publish or unpublish listings." };
    if (!canPublish) {
      input.featured = existing?.featured ?? false;
      if (existing) input.availability = existing.availability;
    }
    if (input.intent === "publish" && existing?.source === "OWNER" && existing.submissionStatus !== "APPROVED") {
      return { ok: false, message: "Approve the owner's submission (Submissions) before publishing it." };
    }

    if (input.priceDisplay === "SHOW_PRICE" && input.priceAmount === undefined) {
      return { ok: false, message: "Add a price, or choose “Contact for price”.", errors: { priceAmount: "Required when the price is shown" } };
    }
    if (input.showExactLocation && (input.latitude === undefined || input.longitude === undefined)) {
      return { ok: false, message: "Exact location needs both latitude and longitude.", errors: { latitude: "Required to show the exact location" } };
    }
    const isHome = HOME_TYPES.includes(input.type);
    const publication = input.intent === "publish" ? "PUBLISHED" : input.intent === "unpublish" ? "DRAFT" : (existing?.publication ?? "DRAFT");
    if (publication === "PUBLISHED" && id) {
      const dev = await db.property.findUnique({ where: { id }, select: { developer: { select: { name: true, authorised: true } } } });
      if (dev?.developer && !dev.developer.authorised) {
        return { ok: false, message: `${dev.developer.name} isn't an authorised developer, so this listing can't be published.` };
      }
    }
    if (publication === "PUBLISHED" && !input.locationId && !input.localityLabel) {
      return { ok: false, message: "Add a location before publishing.", errors: { locationId: "Choose a location or enter a locality" } };
    }

    const { intent: _i, amenityIds, slug, referenceCode, priceAmount, ...fields } = input;
    const data = {
      ...nullify(fields),
      featured: input.featured,
      showExactLocation: input.showExactLocation,
      isSample: input.isSample,
      priceAmount: priceAmount === undefined ? null : BigInt(Math.round(priceAmount)),
      publicPrice: input.priceDisplay === "SHOW_PRICE" && priceAmount !== undefined ? BigInt(Math.round(priceAmount)) : null,
      primaryAreaSqft: isHome ? (input.builtUpAreaSqft ?? input.landAreaSqft ?? null) : (input.landAreaSqft ?? null),
      publication,
      publishedAt: publication === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
      amenities: { set: amenityIds.map((a) => ({ id: a })) },
    } satisfies Prisma.PropertyUncheckedUpdateInput;

    let saved;
    if (id) {
      saved = await db.property.update({
        where: { id },
        data: { ...data, ...(slug && { slug: await uniqueSlug(slug, id) }), ...(referenceCode && { referenceCode }) },
      });
    } else {
      saved = await db.property.create({
        data: {
          ...data,
          amenities: { connect: amenityIds.map((a) => ({ id: a })) },
          slug: await uniqueSlug(slug ?? slugify(input.title)),
          referenceCode: referenceCode ?? (await nextReferenceCode()),
        },
      });
    }

    const action = !id ? "property.created" : input.intent === "publish" ? "property.published" : input.intent === "unpublish" ? "property.unpublished" : "property.updated";
    await audit({ actorId: user.id, action, entityType: "Property", entityId: saved.id, summary: `${saved.referenceCode} · ${saved.title}`, metadata: { availability: saved.availability, publication } });
    // Property Twin history: customer-visible facts only.
    if (publication === "PUBLISHED" && existing?.publication !== "PUBLISHED") await recordActivity(saved.id, "LISTED", "Listing published");
    if (existing && existing.publicPrice !== saved.publicPrice) {
      await recordActivity(saved.id, "PRICE", saved.publicPrice === null ? "Price now available on request" : `Price updated to ${formatPrice(Number(saved.publicPrice))}`);
    }
    if (existing && existing.availability !== saved.availability) await recordActivity(saved.id, "AVAILABILITY", `Availability changed to ${saved.availability.toLowerCase()}`);
    if (existing && existing.publication === "PUBLISHED" && publication === "DRAFT") await recordActivity(saved.id, "UNPUBLISHED", "Listing withdrawn from the website", false);
    if (publication === "PUBLISHED" && !existing?.publishedAt) await alertSavedSearches(saved.id);
    revalidatePath("/", "layout");

    if (!id) redirect(`/admin/properties/${saved.id}?created=1`);
    const msg = input.intent === "publish" ? "Published — the listing is now live." : input.intent === "unpublish" ? "Unpublished — the listing is hidden from the website." : "Changes saved.";
    return { ok: true, message: msg };
  });
}

export async function setAvailability(id: string, availability: "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE") {
  const user = await requirePermission("properties:publish");
  const before = await db.property.findUniqueOrThrow({ where: { id }, select: { availability: true } });
  const p = await db.property.update({ where: { id }, data: { availability } });
  if (before.availability !== availability) await recordActivity(id, "AVAILABILITY", `Availability changed to ${availability.toLowerCase()}`);
  await audit({ actorId: user.id, action: "property.availability", entityType: "Property", entityId: id, summary: `${p.referenceCode} marked ${availability.toLowerCase()}` });
  revalidatePath("/", "layout");
}

export async function toggleFeatured(id: string) {
  const user = await requirePermission("properties:publish");
  const p = await db.property.findUniqueOrThrow({ where: { id } });
  await db.property.update({ where: { id }, data: { featured: !p.featured } });
  await audit({ actorId: user.id, action: "property.featured", entityType: "Property", entityId: id, summary: `${p.referenceCode} ${p.featured ? "removed from" : "added to"} featured` });
  revalidatePath("/", "layout");
}

/** Deleting keeps enquiry history: leads keep their stored property label and lose only the link. */
export async function deleteProperty(id: string) {
  const user = await requirePermission("properties:publish");
  const p = await db.property.findUniqueOrThrow({ where: { id }, include: { images: true } });
  if (p.publication === "PUBLISHED") throw new Error("Unpublish the listing before deleting it.");
  await db.property.delete({ where: { id } });
  await Promise.all(p.images.map((i) => (i.url.startsWith("placeholder:") ? null : deleteStored(i.url))));
  await audit({ actorId: user.id, action: "property.deleted", entityType: "Property", entityId: id, summary: `${p.referenceCode} · ${p.title}` });
  revalidatePath("/", "layout");
  redirect("/admin/properties?deleted=1");
}

// ── Images

export async function updateImage(imageId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("properties:manage");
    const input = z.object({ alt: z.string().trim().min(3, "Describe the image").max(200), kind: z.enum(["PHOTO", "FLOOR_PLAN", "SITE_PLAN"]) }).parse(formObject(fd));
    const img = await db.propertyImage.update({ where: { id: imageId }, data: input });
    await audit({ actorId: user.id, action: "property.image_updated", entityType: "Property", entityId: img.propertyId, summary: "Image details updated" });
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved" };
  });
}

export async function moveImage(imageId: string, direction: -1 | 1) {
  await requirePermission("properties:manage");
  const img = await db.propertyImage.findUniqueOrThrow({ where: { id: imageId } });
  const all = await db.propertyImage.findMany({ where: { propertyId: img.propertyId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const i = all.findIndex((x) => x.id === imageId);
  const j = i + direction;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, n) => db.propertyImage.update({ where: { id: x.id }, data: { sortOrder: n } })));
  revalidatePath("/", "layout");
}

export async function removeImage(imageId: string) {
  const user = await requirePermission("properties:manage");
  const img = await db.propertyImage.delete({ where: { id: imageId } });
  if (!img.url.startsWith("placeholder:")) await deleteStored(img.url);
  await audit({ actorId: user.id, action: "property.image_removed", entityType: "Property", entityId: img.propertyId, summary: "Image removed" });
  revalidatePath("/", "layout");
}

export async function removeDocument(documentId: string) {
  const user = await requirePermission("properties:manage");
  const doc = await db.propertyDocument.delete({ where: { id: documentId } });
  await deleteStored(doc.url);
  await audit({ actorId: user.id, action: "property.document_removed", entityType: "Property", entityId: doc.propertyId, summary: `Document “${doc.title}” removed` });
  revalidatePath("/", "layout");
}

export async function toggleDocumentVisibility(documentId: string) {
  const user = await requirePermission("properties:manage");
  const doc = await db.propertyDocument.findUniqueOrThrow({ where: { id: documentId } });
  await db.propertyDocument.update({ where: { id: documentId }, data: { isPublic: !doc.isPublic } });
  await audit({ actorId: user.id, action: "property.document_visibility", entityType: "Property", entityId: doc.propertyId, summary: `Document “${doc.title}” made ${doc.isPublic ? "private" : "public"}` });
  revalidatePath("/", "layout");
}
