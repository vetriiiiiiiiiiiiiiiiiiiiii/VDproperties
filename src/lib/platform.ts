/**
 * Shared glue between Property Twin, Property Studio, PlotFit and BuildTrace.
 * Everything derives from the same Property rows — no product keeps its own copy of property facts.
 */
import type { FinishLevel, Prisma } from "@prisma/client";
import { db } from "./db";
import { HOME_TYPES } from "./labels";
import type { MatchFacility, MatchProperty } from "./plotfit";
import type { CostCard } from "./studio/estimate";
import { assumedSetbacks, type PlotGeometry } from "./studio/layout";

export type Facility = { name: string; kind: string; distanceKm: number | null; status: "EXISTING" | "PROPOSED" | "UNCONFIRMED"; source?: string };

export function parseFacilities(raw: unknown): Facility[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === "object" && typeof (f as Record<string, unknown>).name === "string")
    .map((f) => ({
      name: String(f.name).slice(0, 120),
      kind: typeof f.kind === "string" ? f.kind : "other",
      distanceKm: typeof f.distanceKm === "number" ? f.distanceKm : null,
      status: f.status === "EXISTING" || f.status === "PROPOSED" ? f.status : "UNCONFIRMED",
      source: typeof f.source === "string" ? f.source : undefined,
    }));
}

/** Boundary as [lat, lng] pairs, validated. */
export function parseBoundary(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)))
    .filter(([lat, lng]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
}

type GeoFields = {
  plotWidthFt: number | null;
  plotDepthFt: number | null;
  setbackFrontFt: number | null;
  setbackRearFt: number | null;
  setbackSideFt: number | null;
  maxCoveragePct: number | null;
  frontBearing: number | null;
};

/** Studio geometry from a property record. Returns null when the dimensions aren't on record. */
export function plotFromProperty(p: GeoFields): PlotGeometry | null {
  if (!p.plotWidthFt || !p.plotDepthFt) return null;
  const recorded = p.setbackFrontFt !== null && p.setbackRearFt !== null && p.setbackSideFt !== null;
  return {
    widthFt: p.plotWidthFt,
    depthFt: p.plotDepthFt,
    setbacks: recorded ? { front: p.setbackFrontFt!, rear: p.setbackRearFt!, side: p.setbackSideFt! } : assumedSetbacks(p.plotWidthFt, p.plotDepthFt),
    setbackSource: recorded ? "RECORD" : "ASSUMED",
    maxCoveragePct: p.maxCoveragePct,
    coverageSource: p.maxCoveragePct ? "RECORD" : null,
    frontBearing: p.frontBearing,
    illustrative: false,
  };
}

const KEY_FACTS = ["landAreaSqft", "plotDimensions", "accessRoad", "utilities", "developmentStatus", "localityLabel", "plotWidthFt"] as const;

export function completeness(p: Record<string, unknown> & { amenities?: unknown[]; images?: unknown[] }) {
  let have = KEY_FACTS.filter((k) => p[k] !== null && p[k] !== undefined && p[k] !== "").length;
  let total = KEY_FACTS.length;
  total += 2;
  if ((p.amenities?.length ?? 0) > 0) have++;
  if ((p.images?.length ?? 0) > 0) have++;
  return have / total;
}

export const matchInclude = {
  location: true,
  amenities: { select: { name: true } },
  images: { take: 1, orderBy: { sortOrder: "asc" }, where: { kind: "PHOTO" } },
  passport: { where: { customerVisible: true }, select: { status: true } },
} satisfies Prisma.PropertyInclude;

type MatchRow = Prisma.PropertyGetPayload<{ include: typeof matchInclude }>;

export function toMatchProperty(r: MatchRow): MatchProperty {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    referenceCode: r.referenceCode,
    kind: HOME_TYPES.includes(r.type) ? "home" : "land",
    availability: r.availability,
    price: r.publicPrice === null ? null : Number(r.publicPrice),
    locationSlug: r.location?.slug ?? null,
    locationName: r.localityLabel ?? r.location?.name ?? null,
    landAreaSqft: r.landAreaSqft,
    builtUpAreaSqft: r.builtUpAreaSqft,
    bedrooms: r.bedrooms,
    plotWidthFt: r.plotWidthFt,
    plotDepthFt: r.plotDepthFt,
    setbacks: { front: r.setbackFrontFt, rear: r.setbackRearFt, side: r.setbackSideFt },
    maxCoveragePct: r.maxCoveragePct,
    amenityNames: r.amenities.map((a) => a.name),
    facilities: parseFacilities(r.nearbyFacilities) as MatchFacility[],
    completeness: completeness(r as unknown as Record<string, unknown>),
    passportReviewed: r.passport.filter((x) => x.status === "REVIEWED").length,
    passportTotal: r.passport.length,
  };
}

/** The newest active rate card for a finish level, preferring one specific to the location. */
export async function findCostCard(finish: FinishLevel, locationId: string | null): Promise<CostCard | null> {
  const card =
    (locationId && (await db.costAssumption.findFirst({ where: { active: true, finish, locationId }, orderBy: { effectiveDate: "desc" } }))) ||
    (await db.costAssumption.findFirst({ where: { active: true, finish, locationId: null }, orderBy: { effectiveDate: "desc" } }));
  if (!card) return null;
  return { ...card, effectiveDate: card.effectiveDate.toISOString().slice(0, 10) };
}

export async function recordActivity(propertyId: string, kind: string, summary: string, isPublic = true) {
  try {
    await db.propertyActivity.create({ data: { propertyId, kind, summary, isPublic } });
  } catch (err) {
    console.error("Failed to record property activity", err);
  }
}

export const PASSPORT_STATUS_LABEL = {
  NOT_PROVIDED: "Not provided",
  RECEIVED: "Received",
  UNDER_REVIEW: "Under review",
  REVIEWED: "Reviewed",
  NEEDS_FOLLOW_UP: "Needs follow-up",
} as const;

export const DEFAULT_PASSPORT_TYPES = [
  "Title / sale deed",
  "Encumbrance certificate",
  "Patta / chitta (revenue record)",
  "Approved layout plan",
  "Building plan approval",
  "Property tax receipt",
  "Survey sketch",
];
