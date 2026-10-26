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

export type EstimateLine = { key: LineKey; label: string; amount: number | null; basis: Basis; detail: string; optional?: boolean };

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

export type Estimate = { lines: EstimateLine[]; total: number; complete: boolean; missing: string[] };

const r = (n: number) => Math.round(n);

export function estimateBudget(e: EstimateInput): Estimate {
  const c = e.card;
  const lines: EstimateLine[] = [];
  const push = (key: LineKey, label: string, estimated: number | null, detail: string, optional = false) => {
    const o = e.overrides[key];
    if (o !== undefined && Number.isFinite(o) && o >= 0) lines.push({ key, label, amount: r(o), basis: "USER", detail: "Your figure", optional });
    else if (estimated === null) lines.push({ key, label, amount: null, basis: "MISSING", detail, optional });
    else lines.push({ key, label, amount: r(estimated), basis: key === "land" ? "QUOTED" : "ESTIMATED", detail, optional });
  };

  push("land", "Land purchase price", e.quotedLandPrice, e.quotedLandPrice === null ? "Price on request — enter the quoted amount" : "Published listing price");
  const land = lines[0].amount;
  push(
    "registration",
    "Registration & transaction costs",
    c && land !== null ? (land * c.registrationPct) / 100 : null,
    c ? `${c.registrationPct}% of land price` : "No rate card — enter an amount",
  );
  push("sitePrep", "Site preparation", c ? c.sitePreparation : null, c ? "Allowance from rate card" : "No rate card — enter an amount");
  push("foundation", "Foundation allowance", c ? e.footprintSqft * c.foundationPerSqft : null, c ? `${e.footprintSqft.toLocaleString("en-IN")} sq ft footprint × ₹${c.foundationPerSqft}/sq ft` : "No rate card — enter an amount");
  push(
    "construction",
    "Construction — structure & finishes",
    c ? e.builtUpSqft * c.constructionPerSqft : null,
    c ? `${e.builtUpSqft.toLocaleString("en-IN")} sq ft × ₹${c.constructionPerSqft}/sq ft (${c.finish.toLowerCase()} finish)` : "No rate card — enter an amount",
  );
  push("utilities", "Utility connections", c ? c.utilitiesConnection : null, c ? "Water, power & drainage allowance" : "No rate card — enter an amount");
  push("landscaping", "Landscaping", e.gardenSqft === 0 ? 0 : c ? e.gardenSqft * c.landscapingPerSqft : null, e.gardenSqft === 0 ? "No garden selected" : c ? `${e.gardenSqft.toLocaleString("en-IN")} sq ft garden` : "No rate card — enter an amount", true);
  push("parking", "Parking & driveway", e.parkingSlots === 0 ? 0 : c ? e.parkingSlots * c.parkingPerSlot : null, e.parkingSlots === 0 ? "No parking selected" : c ? `${e.parkingSlots} space(s)` : "No rate card — enter an amount", true);

  const buildSubtotal = lines.filter((l) => !["land", "registration"].includes(l.key)).reduce((s, l) => s + (l.amount ?? 0), 0);
  push("contingency", "Contingency", c ? (buildSubtotal * c.contingencyPct) / 100 : null, c ? `${c.contingencyPct}% of building costs` : "No rate card — enter an amount");

  const missing = lines.filter((l) => l.basis === "MISSING").map((l) => l.label);
  return { lines, total: lines.reduce((s, l) => s + (l.amount ?? 0), 0), complete: missing.length === 0, missing };
}
