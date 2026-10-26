/**
 * PlotFit — explainable property matching.
 * Hard constraints remove properties that can't meet essential needs; weighted scores rank the rest.
 * Missing data never counts as a pass: such properties go to "needs more information".
 * Ranking never uses price-descending order or any commercial consideration.
 */
import { z } from "zod";
import { assumedSetbacks, generateLayout } from "./studio/layout";

/** Facility kinds used by PlotFit and the Twin; display names live in the dictionaries. */
export const FACILITY_KINDS = { school: true, hospital: true, transport: true, market: true, highway: true } as const;
export type FacilityKind = keyof typeof FACILITY_KINDS;

const csv = z.preprocess((v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v), z.array(z.string().max(80)).max(20));
const optNum = (max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).max(max).optional()).catch(undefined);
const flag = z.preprocess((v) => v === "1" || v === "true" || v === true, z.boolean());

export const criteriaSchema = z.object({
  budget: optNum(1e11),
  reservePct: optNum(90),
  locations: csv.catch([]),
  strictLocation: flag.catch(false),
  type: z.enum(["land", "home", "either"]).catch("either"),
  timeline: z.enum(["now", "later", "unsure"]).catch("unsure"),
  bedrooms: optNum(8),
  builtUp: optNum(20000),
  parking: flag.catch(false),
  garden: flag.catch(false),
  office: flag.catch(false),
  facilities: csv.catch([]),
  maxKm: optNum(100),
  includeUnavailable: flag.catch(false),
});
export type Criteria = z.infer<typeof criteriaSchema>;

export function parseCriteria(raw: Record<string, string | string[] | undefined>): Criteria {
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  return criteriaSchema.parse(flat);
}

export function criteriaToQuery(c: Partial<Criteria>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(c)) {
    if (v === undefined || v === null || v === false || (Array.isArray(v) && !v.length)) continue;
    if (k === "type" && v === "either") continue;
    if (k === "timeline" && v === "unsure") continue;
    p.set(k, Array.isArray(v) ? v.join(",") : v === true ? "1" : String(v));
  }
  return p.toString();
}

export type Weights = { budget: number; location: number; size: number; house: number; infrastructure: number; completeness: number };
export const DEFAULT_WEIGHTS: Weights = { budget: 30, location: 20, size: 15, house: 15, infrastructure: 10, completeness: 10 };

export function normaliseWeights(raw: unknown): Weights {
  const w = { ...DEFAULT_WEIGHTS };
  if (raw && typeof raw === "object") {
    for (const k of Object.keys(w) as (keyof Weights)[]) {
      const v = Number((raw as Record<string, unknown>)[k]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) w[k] = v;
    }
  }
  return w;
}

export type MatchFacility = { kind: string; name: string; distanceKm: number | null; status: "EXISTING" | "PROPOSED" | "UNCONFIRMED" };

export type MatchProperty = {
  id: string;
  slug: string;
  title: string;
  referenceCode: string;
  kind: "land" | "home";
  availability: "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE";
  price: number | null;
  locationSlug: string | null;
  locationName: string | null;
  landAreaSqft: number | null;
  builtUpAreaSqft: number | null;
  bedrooms: number | null;
  plotWidthFt: number | null;
  plotDepthFt: number | null;
  setbacks: { front: number | null; rear: number | null; side: number | null };
  maxCoveragePct: number | null;
  amenityNames: string[];
  facilities: MatchFacility[];
  /** 0..1 share of key facts that are on record. */
  completeness: number;
  passportReviewed: number;
  passportTotal: number;
};

export type Scores = Record<keyof Weights, number>;
/** A reason, compromise or unknown, rendered in the visitor's language by the interface. */
export type Msg = { code: MsgCode; params?: Record<string, string | number> };
export type MsgCode =
  | "budgetComfortable"
  | "budgetWithin"
  | "priceUnknown"
  | "inLocation"
  | "otherLocation"
  | "builtOk"
  | "builtSmall"
  | "builtUnknown"
  | "bedroomsOk"
  | "bedroomsUnknown"
  | "amenityHit"
  | "amenityUnknown"
  | "fits"
  | "fitsPartial"
  | "noFit"
  | "setbacksAssumed"
  | "dimsUnknown"
  | "nothingRecorded"
  | "noUtilities"
  | "facilityNear"
  | "facilityProposed"
  | "facilityNone"
  | "reserved"
  // exclusions
  | "unavailable"
  | "notLand"
  | "notHouse"
  | "outsideLocations"
  | "overBudget"
  | "fewerBedrooms";

export type Match = {
  property: MatchProperty;
  score: number;
  scores: Scores;
  reasons: Msg[];
  compromises: Msg[];
  unknowns: Msg[];
};
export type MatchResult = {
  matches: Match[];
  needsInfo: Match[];
  excluded: { property: MatchProperty; reason: Msg }[];
};

export function matchProperties(props: MatchProperty[], c: Criteria, weights: Weights = DEFAULT_WEIGHTS): MatchResult {
  const result: MatchResult = { matches: [], needsInfo: [], excluded: [] };
  const available = c.budget !== undefined ? c.budget * (1 - (c.reservePct ?? 0) / 100) : undefined;
  const exclude = (p: MatchProperty, code: MsgCode, params?: Msg["params"]) => result.excluded.push({ property: p, reason: { code, params } });

  for (const p of props) {
    // ── Hard constraints
    if (!c.includeUnavailable && (p.availability === "SOLD" || p.availability === "UNAVAILABLE")) { exclude(p, "unavailable"); continue; }
    if (c.type === "land" && p.kind !== "land") { exclude(p, "notLand"); continue; }
    if (c.type === "home" && p.kind !== "home") { exclude(p, "notHouse"); continue; }
    if (c.strictLocation && c.locations.length && (!p.locationSlug || !c.locations.includes(p.locationSlug))) { exclude(p, "outsideLocations"); continue; }
    if (available !== undefined && p.price !== null && p.price > available) { exclude(p, "overBudget", { price: p.price, available }); continue; }
    if (p.kind === "home" && c.bedrooms && p.bedrooms !== null && p.bedrooms < c.bedrooms) { exclude(p, "fewerBedrooms", { n: p.bedrooms, want: c.bedrooms }); continue; }

    const reasons: Msg[] = [];
    const compromises: Msg[] = [];
    const unknowns: Msg[] = [];
    const s: Scores = { budget: 0.5, location: 0.6, size: 0.5, house: 0.5, infrastructure: 0.3, completeness: p.completeness };

    // Budget
    if (available === undefined) {
      s.budget = 0.6;
    } else if (p.price === null) {
      s.budget = 0.3;
      unknowns.push({ code: "priceUnknown" });
    } else {
      const ratio = p.price / available;
      s.budget = 1 - 0.5 * ratio * ratio;
      reasons.push(ratio <= 0.8 ? { code: "budgetComfortable", params: { left: available - p.price } } : { code: "budgetWithin", params: { available } });
    }

    // Location
    if (c.locations.length) {
      if (p.locationSlug && c.locations.includes(p.locationSlug)) {
        s.location = 1;
        reasons.push({ code: "inLocation", params: { name: p.locationName ?? "" } });
      } else {
        s.location = 0.15;
        compromises.push({ code: "otherLocation", params: { name: p.locationName ?? "" } });
      }
    }

    // Size & intended house
    if (p.kind === "home") {
      if (c.builtUp) {
        if (p.builtUpAreaSqft) {
          const ratio = p.builtUpAreaSqft / c.builtUp;
          s.size = Math.min(1, ratio) * (ratio > 1.6 ? 0.85 : 1);
          if (ratio >= 0.9) reasons.push({ code: "builtOk", params: { area: Math.round(p.builtUpAreaSqft) } });
          else compromises.push({ code: "builtSmall", params: { area: Math.round(p.builtUpAreaSqft), want: c.builtUp } });
        } else unknowns.push({ code: "builtUnknown" });
      } else s.size = 0.6;
      let house = 0.6;
      if (c.bedrooms && p.bedrooms !== null) { house = 1; reasons.push({ code: "bedroomsOk", params: { n: p.bedrooms, want: c.bedrooms } }); }
      else if (c.bedrooms) { house = 0.3; unknowns.push({ code: "bedroomsUnknown" }); }
      for (const [want, what, match] of [[c.parking, "parking", "parking"], [c.garden, "garden", "garden"], [c.office, "office", "study"]] as const) {
        if (!want) continue;
        if (p.amenityNames.some((a) => a.toLowerCase().includes(match))) reasons.push({ code: "amenityHit", params: { what } });
        else { house -= 0.12; unknowns.push({ code: "amenityUnknown", params: { what } }); }
      }
      s.house = Math.max(0, Math.min(1, house));
    } else {
      // Land: will the intended house fit?
      const target = c.builtUp ?? (c.bedrooms ? 600 + c.bedrooms * 400 : null);
      if (!target) {
        s.size = p.landAreaSqft ? 0.6 : 0.3;
        s.house = 0.5;
      } else if (p.plotWidthFt && p.plotDepthFt) {
        const fromRecord = p.setbacks.front !== null && p.setbacks.rear !== null && p.setbacks.side !== null;
        const layout = generateLayout(
          {
            widthFt: p.plotWidthFt,
            depthFt: p.plotDepthFt,
            setbacks: fromRecord ? { front: p.setbacks.front!, rear: p.setbacks.rear!, side: p.setbacks.side! } : assumedSetbacks(p.plotWidthFt, p.plotDepthFt),
            setbackSource: fromRecord ? "RECORD" : "ASSUMED",
            maxCoveragePct: p.maxCoveragePct,
            coverageSource: p.maxCoveragePct ? "RECORD" : null,
            frontBearing: null,
            illustrative: false,
          },
          { bedrooms: c.bedrooms ?? 3, floors: 2, builtUpSqft: target, style: "CONTEMPORARY", parkingSlots: c.parking ? 1 : 0, garden: c.garden, study: c.office, finish: "STANDARD" },
        );
        const fit = layout.achievedBuiltUpSqft / target;
        s.size = Math.min(1, fit);
        s.house = layout.feasible ? Math.min(1, fit) : 0.2;
        if (layout.feasible && fit >= 0.98) reasons.push({ code: "fits", params: { target, w: p.plotWidthFt, d: p.plotDepthFt, assumed: fromRecord ? 0 : 1 } });
        else if (layout.feasible) compromises.push({ code: "fitsPartial", params: { achieved: layout.achievedBuiltUpSqft, target } });
        else compromises.push({ code: "noFit" });
        if (!fromRecord) unknowns.push({ code: "setbacksAssumed" });
      } else if (p.landAreaSqft) {
        const roughNeed = target / 2 / 0.6;
        s.size = Math.min(1, p.landAreaSqft / roughNeed);
        s.house = 0.4;
        unknowns.push({ code: "dimsUnknown" });
      } else {
        s.size = 0.2;
        s.house = 0.2;
        unknowns.push({ code: "nothingRecorded" });
      }
      if (c.timeline === "now" && !p.amenityNames.some((a) => /water|electric|power/i.test(a))) unknowns.push({ code: "noUtilities" });
    }

    // Infrastructure & nearby facilities
    let infra = Math.min(1, p.amenityNames.length / 5);
    if (c.facilities.length) {
      const maxKm = c.maxKm ?? 5;
      let hits = 0;
      for (const kind of c.facilities) {
        const near = p.facilities.filter((f) => f.kind === kind && f.distanceKm !== null && f.distanceKm <= maxKm);
        const existing = near.find((f) => f.status === "EXISTING");
        if (existing) { hits += 1; reasons.push({ code: "facilityNear", params: { name: existing.name, km: existing.distanceKm! } }); }
        else if (near.find((f) => f.status === "PROPOSED")) { hits += 0.4; compromises.push({ code: "facilityProposed", params: { kind, km: maxKm } }); }
        else unknowns.push({ code: "facilityNone", params: { kind, km: maxKm } });
      }
      infra = 0.4 * infra + 0.6 * (hits / c.facilities.length);
    }
    s.infrastructure = infra;
    if (p.passportTotal > 0) s.completeness = 0.6 * p.completeness + 0.4 * (p.passportReviewed / p.passportTotal);
    if (p.availability === "RESERVED") compromises.push({ code: "reserved" });

    const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    const score = Math.round(((Object.keys(weights) as (keyof Weights)[]).reduce((acc, k) => acc + weights[k] * s[k], 0) / totalW) * 100);
    const m: Match = { property: p, score, scores: s, reasons, compromises, unknowns };

    // Price unknown with a budget set, or land fit unassessable → needs information first.
    const cannotAssess = (available !== undefined && p.price === null) || (p.kind === "land" && !!(c.builtUp || c.bedrooms) && !p.plotWidthFt && !p.landAreaSqft);
    (cannotAssess ? result.needsInfo : result.matches).push(m);
  }

  result.matches.sort((a, b) => b.score - a.score || a.property.referenceCode.localeCompare(b.property.referenceCode));
  result.needsInfo.sort((a, b) => b.score - a.score);
  return result;
}

/** Picks the strongest property for each lens, without repeating the overall winner where possible. */
export function highlights(matches: Match[]) {
  const by = (k: keyof Scores) => [...matches].sort((a, b) => b.scores[k] - a.scores[k] || b.score - a.score)[0];
  return { overall: matches[0], budget: by("budget"), location: by("location"), house: [...matches].sort((a, b) => b.scores.house + b.scores.size - (a.scores.house + a.scores.size))[0] };
}
