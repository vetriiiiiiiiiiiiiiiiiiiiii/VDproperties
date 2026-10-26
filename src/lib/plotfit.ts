/**
 * PlotFit — explainable property matching.
 * Hard constraints remove properties that can't meet essential needs; weighted scores rank the rest.
 * Missing data never counts as a pass: such properties go to "needs more information".
 * Ranking never uses price-descending order or any commercial consideration.
 */
import { z } from "zod";
import { assumedSetbacks, generateLayout } from "./studio/layout";

export const FACILITY_KINDS = {
  school: "Schools",
  hospital: "Hospital / clinic",
  transport: "Public transport",
  market: "Shops & market",
  highway: "Main road / highway",
} as const;
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
export type Match = {
  property: MatchProperty;
  score: number;
  scores: Scores;
  reasons: string[];
  compromises: string[];
  unknowns: string[];
};
export type MatchResult = {
  matches: Match[];
  needsInfo: Match[];
  excluded: { property: MatchProperty; reason: string }[];
};

const fmt = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} lakh` : `₹${Math.round(n).toLocaleString("en-IN")}`);

export function matchProperties(props: MatchProperty[], c: Criteria, weights: Weights = DEFAULT_WEIGHTS): MatchResult {
  const result: MatchResult = { matches: [], needsInfo: [], excluded: [] };
  const available = c.budget !== undefined ? c.budget * (1 - (c.reservePct ?? 0) / 100) : undefined;

  for (const p of props) {
    // ── Hard constraints
    if (!c.includeUnavailable && (p.availability === "SOLD" || p.availability === "UNAVAILABLE")) {
      result.excluded.push({ property: p, reason: "No longer available" });
      continue;
    }
    if (c.type === "land" && p.kind !== "land") { result.excluded.push({ property: p, reason: "Not land" }); continue; }
    if (c.type === "home" && p.kind !== "home") { result.excluded.push({ property: p, reason: "Not a house" }); continue; }
    if (c.strictLocation && c.locations.length && (!p.locationSlug || !c.locations.includes(p.locationSlug))) {
      result.excluded.push({ property: p, reason: "Outside your chosen locations" });
      continue;
    }
    if (available !== undefined && p.price !== null && p.price > available) {
      result.excluded.push({ property: p, reason: `Price ${fmt(p.price)} is above the ${fmt(available)} you set aside for the property` });
      continue;
    }
    if (p.kind === "home" && c.bedrooms && p.bedrooms !== null && p.bedrooms < c.bedrooms) {
      result.excluded.push({ property: p, reason: `${p.bedrooms} bedrooms — fewer than the ${c.bedrooms} you need` });
      continue;
    }

    const reasons: string[] = [];
    const compromises: string[] = [];
    const unknowns: string[] = [];
    const s: Scores = { budget: 0.5, location: 0.6, size: 0.5, house: 0.5, infrastructure: 0.3, completeness: p.completeness };

    // Budget
    if (available === undefined) {
      s.budget = 0.6;
    } else if (p.price === null) {
      s.budget = 0.3;
      unknowns.push("The price isn't published, so budget fit can't be confirmed — ask for the current price.");
    } else {
      const ratio = p.price / available;
      s.budget = 1 - 0.5 * ratio * ratio;
      reasons.push(ratio <= 0.8 ? `Comfortably within budget — leaves about ${fmt(available - p.price)} of the amount set aside.` : `Within the ${fmt(available)} you set aside for the property.`);
    }

    // Location
    if (c.locations.length) {
      if (p.locationSlug && c.locations.includes(p.locationSlug)) {
        s.location = 1;
        reasons.push(`In ${p.locationName}, one of your preferred locations.`);
      } else {
        s.location = 0.15;
        compromises.push(`In ${p.locationName ?? "a location"} you didn't select.`);
      }
    }

    // Size & intended house
    if (p.kind === "home") {
      if (c.builtUp) {
        if (p.builtUpAreaSqft) {
          const ratio = p.builtUpAreaSqft / c.builtUp;
          s.size = Math.min(1, ratio) * (ratio > 1.6 ? 0.85 : 1);
          if (ratio >= 0.9) reasons.push(`${Math.round(p.builtUpAreaSqft).toLocaleString("en-IN")} sq ft built-up — meets the size you want.`);
          else compromises.push(`${Math.round(p.builtUpAreaSqft).toLocaleString("en-IN")} sq ft built-up is smaller than the ${c.builtUp.toLocaleString("en-IN")} sq ft you prefer.`);
        } else unknowns.push("Built-up area isn't recorded.");
      } else s.size = 0.6;
      let house = 0.6;
      if (c.bedrooms && p.bedrooms !== null) { house = 1; reasons.push(`${p.bedrooms} bedrooms meets your need for ${c.bedrooms}.`); }
      else if (c.bedrooms) { house = 0.3; unknowns.push("Bedroom count isn't recorded."); }
      for (const [want, label] of [[c.parking, "parking"], [c.garden, "a garden"], [c.office, "a home office"]] as const) {
        if (!want) continue;
        const hit = p.amenityNames.some((a) => a.toLowerCase().includes(label === "a home office" ? "study" : label.replace("a ", "")));
        if (hit) reasons.push(`Listing records ${label}.`);
        else { house -= 0.12; unknowns.push(`The listing doesn't record ${label}.`); }
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
        if (layout.feasible && fit >= 0.98) reasons.push(`A two-storey concept of about ${target.toLocaleString("en-IN")} sq ft fits on the ${p.plotWidthFt} × ${p.plotDepthFt} ft plot${fromRecord ? "" : " (using assumed setbacks)"}.`);
        else if (layout.feasible) compromises.push(`About ${layout.achievedBuiltUpSqft.toLocaleString("en-IN")} sq ft fits across two floors — less than the ${target.toLocaleString("en-IN")} sq ft you want.`);
        else compromises.push("The intended house doesn't fit within this plot's recorded limits.");
        if (!fromRecord) unknowns.push("Setbacks for this plot aren't on record, so the fit uses general assumptions.");
      } else if (p.landAreaSqft) {
        const roughNeed = target / 2 / 0.6;
        s.size = Math.min(1, p.landAreaSqft / roughNeed);
        s.house = 0.4;
        unknowns.push("Plot dimensions aren't recorded, so the available records don't yet establish whether your house layout will fit.");
      } else {
        s.size = 0.2;
        s.house = 0.2;
        unknowns.push("Neither plot area nor dimensions are recorded.");
      }
      if (c.timeline === "now" && !p.amenityNames.some((a) => /water|electric|power/i.test(a))) unknowns.push("You plan to build soon, but water or power connections aren't recorded for this plot.");
    }

    // Infrastructure & nearby facilities
    let infra = Math.min(1, p.amenityNames.length / 5);
    if (c.facilities.length) {
      const maxKm = c.maxKm ?? 5;
      let hits = 0;
      for (const kind of c.facilities) {
        const label = FACILITY_KINDS[kind as FacilityKind] ?? kind;
        const near = p.facilities.filter((f) => f.kind === kind && f.distanceKm !== null && f.distanceKm <= maxKm);
        const existing = near.find((f) => f.status === "EXISTING");
        if (existing) { hits += 1; reasons.push(`${existing.name} is about ${existing.distanceKm} km away.`); }
        else if (near.find((f) => f.status === "PROPOSED")) { hits += 0.4; compromises.push(`${label} within ${maxKm} km is only proposed, not built.`); }
        else unknowns.push(`No ${label.toLowerCase()} within ${maxKm} km is on record.`);
      }
      infra = 0.4 * infra + 0.6 * (hits / c.facilities.length);
    }
    s.infrastructure = infra;
    if (p.passportTotal > 0) s.completeness = 0.6 * p.completeness + 0.4 * (p.passportReviewed / p.passportTotal);
    if (p.availability === "RESERVED") compromises.push("Currently reserved — it may not stay available.");

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
