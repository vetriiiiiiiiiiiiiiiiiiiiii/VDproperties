/**
 * Property Studio budget engine. Every line says where its number came from:
 * QUOTED (the listing's published price), ESTIMATED (an administrator's rate card),
 * USER (the customer's own figure) or MISSING (no basis — never filled with a guess).
 */

export type CostCard = {
  id: string;
  name: string;
  finish: "BASIC" | "STANDARD" | "PREMIUM";
  constructionPerSqft: number;
  foundationPerSqft: number;
  sitePreparation: number;
  utilitiesConnection: number;
  registrationPct: number;
  landscapingPerSqft: number;
  parkingPerSlot: number;
  contingencyPct: number;
  source: string;
  effectiveDate: string;
  isDemo: boolean;
};

export type Basis = "QUOTED" | "ESTIMATED" | "USER" | "MISSING";

/** Detail codes explain each line; the interface renders them in the visitor's language. */
export type DetailCode =
  | "user"
  | "quoted"
  | "priceOnRequest"
  | "noCard"
  | "registrationPct"
  | "cardAllowance"
  | "foundationRate"
  | "constructionRate"
  | "utilities"
  | "garden"
  | "noGarden"
  | "parking"
  | "noParking"
  | "contingencyPct";

export type EstimateLine = { key: LineKey; amount: number | null; basis: Basis; detail: DetailCode; params?: Record<string, number | string>; optional?: boolean; /** Legacy saved scenarios */ label?: string };

export const LINE_KEYS = ["land", "registration", "sitePrep", "foundation", "construction", "utilities", "landscaping", "parking", "contingency"] as const;
export type LineKey = (typeof LINE_KEYS)[number];

export type EstimateInput = {
  /** Published listing price, when there is one. */
  quotedLandPrice: number | null;
  builtUpSqft: number;
  footprintSqft: number;
  gardenSqft: number;
  parkingSlots: number;
  card: CostCard | null;
  /** Customer-entered amounts replace the corresponding line. */
  overrides: Partial<Record<LineKey, number>>;
};

export type Estimate = { lines: EstimateLine[]; total: number; complete: boolean; missing: LineKey[] };

const r = (n: number) => Math.round(n);

export function estimateBudget(e: EstimateInput): Estimate {
  const c = e.card;
  const lines: EstimateLine[] = [];
  const push = (key: LineKey, estimated: number | null, detail: DetailCode, params?: Record<string, number | string>, optional = false) => {
    const o = e.overrides[key];
    if (o !== undefined && Number.isFinite(o) && o >= 0) lines.push({ key, amount: r(o), basis: "USER", detail: "user", optional });
    else if (estimated === null) lines.push({ key, amount: null, basis: "MISSING", detail, params, optional });
    else lines.push({ key, amount: r(estimated), basis: key === "land" ? "QUOTED" : "ESTIMATED", detail, params, optional });
  };

  push("land", e.quotedLandPrice, e.quotedLandPrice === null ? "priceOnRequest" : "quoted");
  const land = lines[0].amount;
  push("registration", c && land !== null ? (land * c.registrationPct) / 100 : null, c ? "registrationPct" : "noCard", c ? { pct: c.registrationPct } : undefined);
  push("sitePrep", c ? c.sitePreparation : null, c ? "cardAllowance" : "noCard");
  push("foundation", c ? e.footprintSqft * c.foundationPerSqft : null, c ? "foundationRate" : "noCard", c ? { area: e.footprintSqft, rate: c.foundationPerSqft } : undefined);
  push("construction", c ? e.builtUpSqft * c.constructionPerSqft : null, c ? "constructionRate" : "noCard", c ? { area: e.builtUpSqft, rate: c.constructionPerSqft, finish: c.finish } : undefined);
  push("utilities", c ? c.utilitiesConnection : null, c ? "utilities" : "noCard");
  push("landscaping", e.gardenSqft === 0 ? 0 : c ? e.gardenSqft * c.landscapingPerSqft : null, e.gardenSqft === 0 ? "noGarden" : c ? "garden" : "noCard", { area: e.gardenSqft }, true);
  push("parking", e.parkingSlots === 0 ? 0 : c ? e.parkingSlots * c.parkingPerSlot : null, e.parkingSlots === 0 ? "noParking" : c ? "parking" : "noCard", { n: e.parkingSlots }, true);

  const buildSubtotal = lines.filter((l) => !["land", "registration"].includes(l.key)).reduce((s, l) => s + (l.amount ?? 0), 0);
  push("contingency", c ? (buildSubtotal * c.contingencyPct) / 100 : null, c ? "contingencyPct" : "noCard", c ? { pct: c.contingencyPct } : undefined);

  const missing = lines.filter((l) => l.basis === "MISSING").map((l) => l.key);
  return { lines, total: lines.reduce((s, l) => s + (l.amount ?? 0), 0), complete: missing.length === 0, missing };
}
