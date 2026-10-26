import type { PlanningScenario, Property } from "@prisma/client";

export type ScenarioResult = {
  feasible: boolean;
  achievedBuiltUpSqft: number;
  footprintSqft: number;
  coveragePct: number;
  plotAreaSqft: number;
  warnings: { level: string; text: string }[];
  estimate: { total: number; complete: boolean; missing: string[]; lines: { key: string; label: string; amount: number | null; basis: string }[] };
  card: { name: string; source: string; effectiveDate: string; isDemo: boolean } | null;
};

export type ScenarioInputs = {
  bedrooms: number;
  floors: number;
  builtUpSqft: number;
  style: string;
  parkingSlots: number;
  garden: boolean;
  study: boolean;
  finish: string;
  targetBudget?: number | null;
  illustrativePlot?: { widthFt: number; depthFt: number; price: number | null } | null;
};

/** Why a saved scenario may no longer reflect the property. */
export function scenarioStatus(s: PlanningScenario & { property: Pick<Property, "updatedAt" | "availability" | "publication" | "slug"> | null }) {
  const snap = s.plotSnapshot as { illustrative?: boolean };
  if (snap?.illustrative) return { kind: "illustrative" as const, note: "Illustrative plot" };
  if (!s.property || s.property.publication !== "PUBLISHED") return { kind: "gone" as const, note: "This property is no longer listed" };
  if (s.property.availability === "SOLD" || s.property.availability === "UNAVAILABLE") return { kind: "unavailable" as const, note: `Property is now ${s.property.availability.toLowerCase()}` };
  if (s.propertyUpdatedAt && s.property.updatedAt > s.propertyUpdatedAt) return { kind: "stale" as const, note: "Property details changed since you saved — the estimate may need updating" };
  return { kind: "current" as const, note: "Up to date" };
}

/** Rebuilds the Studio URL so a scenario can be reopened with the same choices. */
export function studioHref(s: PlanningScenario & { property: { slug: string } | null }) {
  const i = s.inputs as ScenarioInputs;
  const p = new URLSearchParams({ bed: String(i.bedrooms), fl: String(i.floors), area: String(i.builtUpSqft), style: i.style, park: String(i.parkingSlots), garden: i.garden ? "1" : "0", finish: i.finish });
  if (i.study) p.set("study", "1");
  if (i.targetBudget) p.set("budget", String(i.targetBudget));
  if (s.property) return `/studio/${s.property.slug}?${p}`;
  if (i.illustrativePlot) {
    p.set("w", String(i.illustrativePlot.widthFt));
    p.set("d", String(i.illustrativePlot.depthFt));
    if (i.illustrativePlot.price) p.set("price", String(i.illustrativePlot.price));
  }
  return `/studio/illustrative?${p}`;
}
