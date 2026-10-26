"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_PASSPORT_TYPES, PASSPORT_STATUS_LABEL, recordActivity } from "@/lib/platform";
import { DEFAULT_WEIGHTS } from "@/lib/plotfit";
import { checkbox, formObject, optId, optNum, optStr, runAction, type ActionResult } from "@/lib/admin";

const num = (lo: number, hi: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ error: "Enter a number" }).min(lo).max(hi).optional());

/** Boundary text: one "lat, lng" pair per line. */
function parseBoundaryText(text: string): [number, number][] | string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const pts: [number, number][] = [];
  for (const l of lines) {
    const [a, b] = l.split(/[,\s]+/).map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return `Invalid coordinate line: “${l.slice(0, 40)}”`;
    pts.push([a, b]);
  }
  if (pts.length < 3) return "A boundary needs at least three points";
  return pts;
}

/** Facilities text: "Name | kind | distance km | EXISTING|PROPOSED|UNCONFIRMED | source" per line. */
function parseFacilitiesText(text: string) {
  return text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter(([name]) => name)
    .slice(0, 40)
    .map(([name, kind, km, status, source]) => ({
      name: name.slice(0, 120),
      kind: (kind || "other").toLowerCase().slice(0, 30),
      distanceKm: km && Number.isFinite(Number(km)) ? Number(km) : null,
      status: status?.toUpperCase() === "EXISTING" || status?.toUpperCase() === "PROPOSED" ? status.toUpperCase() : "UNCONFIRMED",
      source: source?.slice(0, 160) || undefined,
    }));
}

export async function saveTwinData(propertyId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("properties:manage");
    const input = z
      .object({
        plotWidthFt: num(5, 5000),
        plotDepthFt: num(5, 5000),
        frontBearing: num(0, 359.99),
        setbackFrontFt: num(0, 200),
        setbackRearFt: num(0, 200),
        setbackSideFt: num(0, 200),
        maxCoveragePct: num(5, 100),
        siteConstraints: optStr(2000),
        boundaryStatus: z.enum(["NONE", "APPROXIMATE", "SURVEYED"]),
        boundarySource: optStr(200),
        boundary: z.string().max(10000).default(""),
        facilities: z.string().max(10000).default(""),
        developerId: optId,
      })
      .parse(formObject(fd));
    const boundary = parseBoundaryText(input.boundary);
    if (typeof boundary === "string") return { ok: false, message: boundary, errors: { boundary } };
    if (input.boundaryStatus === "SURVEYED" && !input.boundarySource) {
      return { ok: false, message: "Name the survey record that supports a “surveyed” boundary.", errors: { boundarySource: "Required for surveyed boundaries" } };
    }
    const sb = [input.setbackFrontFt, input.setbackRearFt, input.setbackSideFt];
    if (sb.some((v) => v !== undefined) && sb.some((v) => v === undefined)) {
      return { ok: false, message: "Enter all three setbacks, or leave all empty.", errors: { setbackFrontFt: "Front, rear and side are needed together" } };
    }
    const n = <T,>(v: T | undefined) => (v === undefined ? null : v);
    await db.property.update({
      where: { id: propertyId },
      data: {
        plotWidthFt: n(input.plotWidthFt),
        plotDepthFt: n(input.plotDepthFt),
        frontBearing: n(input.frontBearing),
        setbackFrontFt: n(input.setbackFrontFt),
        setbackRearFt: n(input.setbackRearFt),
        setbackSideFt: n(input.setbackSideFt),
        maxCoveragePct: n(input.maxCoveragePct),
        siteConstraints: n(input.siteConstraints),
        boundary: boundary.length ? boundary : Prisma.DbNull,
        boundaryStatus: boundary.length ? input.boundaryStatus : "NONE",
        boundarySource: n(input.boundarySource),
        nearbyFacilities: parseFacilitiesText(input.facilities) as Prisma.InputJsonValue,
        developerId: n(input.developerId),
      },
    });
    await audit({ actorId: user.id, action: "property.twin_updated", entityType: "Property", entityId: propertyId, summary: "Property Twin data updated (geometry, site, facilities)" });
    revalidatePath("/", "layout");
    return { ok: true, message: "Property Twin data saved." };
  });
}

export async function addPassportItems(propertyId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("passport:manage");
    const custom = String(fd.get("documentType") ?? "").trim();
    const useDefaults = fd.get("defaults") === "on";
    const existing = await db.passportItem.findMany({ where: { propertyId }, select: { documentType: true } });
    const have = new Set(existing.map((e) => e.documentType.toLowerCase()));
    const types = [...(useDefaults ? DEFAULT_PASSPORT_TYPES : []), ...(custom ? [custom.slice(0, 120)] : [])].filter((t) => !have.has(t.toLowerCase()));
    if (!types.length) return { ok: false, message: "Enter a document type, or tick the standard list." };
    await db.passportItem.createMany({ data: types.map((documentType, i) => ({ propertyId, documentType, sortOrder: existing.length + i })) });
    await audit({ actorId: user.id, action: "passport.items_added", entityType: "Property", entityId: propertyId, summary: `${types.length} passport item(s) added` });
    revalidatePath("/", "layout");
    return { ok: true, message: `${types.length} item(s) added to the register.` };
  });
}

export async function updatePassportItem(itemId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("passport:manage");
    const input = z
      .object({
        status: z.enum(["NOT_PROVIDED", "RECEIVED", "UNDER_REVIEW", "REVIEWED", "NEEDS_FOLLOW_UP"]),
        documentId: optId,
        publicNote: optStr(500),
        privateNote: optStr(2000),
        customerVisible: checkbox,
      })
      .parse(formObject(fd));
    const item = await db.passportItem.findUniqueOrThrow({ where: { id: itemId } });
    if (input.documentId && !(await db.propertyDocument.findFirst({ where: { id: input.documentId, propertyId: item.propertyId } }))) {
      return { ok: false, message: "That document belongs to another property." };
    }
    if (input.status === "REVIEWED" && !input.documentId && !input.privateNote) {
      return { ok: false, message: "Attach the reviewed document or record what was reviewed in the staff note.", errors: { privateNote: "Evidence needed for “Reviewed”" } };
    }
    const reviewedNow = input.status === "REVIEWED" && item.status !== "REVIEWED";
    await db.passportItem.update({
      where: { id: itemId },
      data: {
        status: input.status,
        documentId: input.documentId ?? null,
        publicNote: input.publicNote ?? null,
        privateNote: input.privateNote ?? null,
        customerVisible: input.customerVisible,
        ...(reviewedNow ? { reviewerId: user.id, reviewedAt: new Date() } : {}),
        ...(input.status !== "REVIEWED" ? { reviewedAt: null, reviewerId: null } : {}),
      },
    });
    if (item.status !== input.status) {
      await recordActivity(item.propertyId, "PASSPORT", `${item.documentType}: ${PASSPORT_STATUS_LABEL[input.status].toLowerCase()}`, input.customerVisible);
    }
    await audit({ actorId: user.id, action: "passport.updated", entityType: "Property", entityId: item.propertyId, summary: `${item.documentType}: ${item.status} → ${input.status}` });
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved" };
  });
}

export async function deletePassportItem(itemId: string) {
  const user = await requirePermission("passport:manage");
  const item = await db.passportItem.delete({ where: { id: itemId } });
  await audit({ actorId: user.id, action: "passport.deleted", entityType: "Property", entityId: item.propertyId, summary: `Passport item “${item.documentType}” removed` });
  revalidatePath("/", "layout");
}

const cardSchema = z.object({
  name: z.string().trim().min(3).max(100),
  finish: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  locationId: optId,
  constructionPerSqft: z.coerce.number({ error: "Enter a rate" }).positive("Enter a rate").max(100000),
  foundationPerSqft: optNum(100000),
  sitePreparation: optNum(1e9),
  utilitiesConnection: optNum(1e9),
  registrationPct: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(30).optional()),
  landscapingPerSqft: optNum(100000),
  parkingPerSlot: optNum(1e8),
  contingencyPct: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(50).optional()),
  source: z.string().trim().min(3, "Cite where these rates come from").max(200),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  notes: optStr(1000),
  isDemo: checkbox,
  active: checkbox,
});

export async function saveCostCard(id: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("costs:manage");
    const i = cardSchema.parse(formObject(fd));
    const data = {
      name: i.name, finish: i.finish, locationId: i.locationId ?? null, constructionPerSqft: i.constructionPerSqft, foundationPerSqft: i.foundationPerSqft ?? 0,
      sitePreparation: i.sitePreparation ?? 0, utilitiesConnection: i.utilitiesConnection ?? 0, registrationPct: i.registrationPct ?? 0, landscapingPerSqft: i.landscapingPerSqft ?? 0,
      parkingPerSlot: i.parkingPerSlot ?? 0, contingencyPct: i.contingencyPct ?? 0, source: i.source, effectiveDate: new Date(`${i.effectiveDate}T00:00:00Z`), notes: i.notes ?? null,
      isDemo: i.isDemo, active: i.active,
    };
    const card = id ? await db.costAssumption.update({ where: { id }, data }) : await db.costAssumption.create({ data });
    await audit({ actorId: user.id, action: id ? "costs.updated" : "costs.created", entityType: "CostAssumption", entityId: card.id, summary: `${card.name}: ₹${card.constructionPerSqft}/sq ft (${card.source})` });
    revalidatePath("/admin/costs");
    revalidatePath("/studio", "layout");
    return { ok: true, message: id ? "Rate card updated. New estimates use it immediately; saved scenarios keep their original figures." : "Rate card added." };
  });
}

export async function saveDeveloper(id: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("developers:manage");
    const i = z.object({ name: z.string().trim().min(2).max(120), contact: optStr(200), notes: optStr(1000), authorised: checkbox }).parse(formObject(fd));
    const data = { name: i.name, contact: i.contact ?? null, notes: i.notes ?? null, authorised: i.authorised };
    const dev = id ? await db.developer.update({ where: { id }, data }) : await db.developer.create({ data });
    await audit({ actorId: user.id, action: id ? "developer.updated" : "developer.created", entityType: "Developer", entityId: dev.id, summary: `${dev.name} (${dev.authorised ? "authorised" : "not authorised"})` });
    revalidatePath("/admin/developers");
    return { ok: true, message: "Developer saved." };
  });
}

export async function savePlotfitWeights(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("plotfit:manage");
    const w = Object.fromEntries((Object.keys(DEFAULT_WEIGHTS) as (keyof typeof DEFAULT_WEIGHTS)[]).map((k) => [k, z.coerce.number().int().min(0).max(100).parse(fd.get(k))]));
    if (Object.values(w).every((v) => v === 0)) return { ok: false, message: "At least one weight must be above zero." };
    await db.siteSettings.update({ where: { id: 1 }, data: { plotfitWeights: w } });
    await audit({ actorId: user.id, action: "plotfit.weights_updated", entityType: "SiteSettings", entityId: "1", summary: `PlotFit weights: ${JSON.stringify(w)}` });
    revalidatePath("/plotfit", "layout");
    return { ok: true, message: "Matching weights saved. Results use them immediately." };
  });
}
