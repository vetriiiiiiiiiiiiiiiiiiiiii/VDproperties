import { describe, expect, it } from "vitest";
import { criteriaToQuery, matchProperties, parseCriteria, type MatchProperty } from "@/lib/plotfit";
import { estimateBudget, type CostCard } from "@/lib/studio/estimate";
import { assumedSetbacks, DEFAULT_INPUTS, generateLayout, northArrowAngle, partition, type PlotGeometry } from "@/lib/studio/layout";

const plot = (w: number, d: number, extra: Partial<PlotGeometry> = {}): PlotGeometry => ({
  widthFt: w, depthFt: d, setbacks: assumedSetbacks(w, d), setbackSource: "ASSUMED", maxCoveragePct: null, coverageSource: null, frontBearing: null, illustrative: false, ...extra,
});

describe("layout engine", () => {
  it("fits a standard home on a 30×40 plot and keeps rooms inside the footprint", () => {
    const r = generateLayout(plot(30, 40), { ...DEFAULT_INPUTS, builtUpSqft: 1400, floors: 2 });
    expect(r.feasible).toBe(true);
    expect(r.footprint.x).toBeGreaterThanOrEqual(r.envelope.x);
    expect(r.footprint.x + r.footprint.w).toBeLessThanOrEqual(r.envelope.x + r.envelope.w + 1e-6);
    for (const f of r.floors) for (const room of f.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(r.footprint.x - 1e-6);
      expect(room.y + room.h).toBeLessThanOrEqual(r.footprint.y + r.footprint.h + 1e-6);
    }
    expect(r.floors).toHaveLength(2);
  });

  it("reports a shortfall rather than overbuilding", () => {
    const r = generateLayout(plot(25, 35), { ...DEFAULT_INPUTS, builtUpSqft: 4000, floors: 1 });
    expect(r.achievedBuiltUpSqft).toBeLessThan(4000);
    expect(r.warnings.some((w) => /less than/.test(w.text))).toBe(true);
  });

  it("responds to inputs: more floors means a smaller footprint", () => {
    const one = generateLayout(plot(40, 60), { ...DEFAULT_INPUTS, floors: 1, builtUpSqft: 1600 });
    const two = generateLayout(plot(40, 60), { ...DEFAULT_INPUTS, floors: 2, builtUpSqft: 1600 });
    expect(two.footprintSqft).toBeLessThan(one.footprintSqft);
  });

  it("flags coverage above a recorded limit as a blocker", () => {
    const r = generateLayout(plot(30, 40, { maxCoveragePct: 40, coverageSource: "RECORD" }), { ...DEFAULT_INPUTS, floors: 1, builtUpSqft: 700, parkingSlots: 0, garden: false });
    expect(r.feasible).toBe(false);
    expect(r.warnings.find((w) => w.level === "blocker")?.text).toMatch(/recorded for this plot/);
  });

  it("refuses plots too small after setbacks", () => {
    expect(generateLayout(plot(12, 14), DEFAULT_INPUTS).feasible).toBe(false);
  });

  it("partitions area proportionally", () => {
    const rooms = partition({ x: 0, y: 0, w: 20, h: 10 }, [{ name: "a", kind: "public", area: 150 }, { name: "b", kind: "public", area: 50 }]);
    expect(rooms[0].areaSqft).toBe(150);
    expect(rooms[1].areaSqft).toBe(50);
  });

  it("orients the north arrow from the road bearing", () => {
    expect(northArrowAngle(180)).toBe(0);
    expect(northArrowAngle(90)).toBe(90);
    expect(northArrowAngle(0)).toBe(180);
  });
});

const card: CostCard = {
  id: "c", name: "Test card", finish: "STANDARD", constructionPerSqft: 2000, foundationPerSqft: 300, sitePreparation: 50000, utilitiesConnection: 80000,
  registrationPct: 7, landscapingPerSqft: 100, parkingPerSlot: 40000, contingencyPct: 5, source: "Unit test", effectiveDate: "2026-01-01", isDemo: true,
};

describe("budget engine", () => {
  it("labels every line and totals them", () => {
    const e = estimateBudget({ quotedLandPrice: 2_000_000, builtUpSqft: 1000, footprintSqft: 500, gardenSqft: 100, parkingSlots: 1, card, overrides: {} });
    const line = (k: string) => e.lines.find((l) => l.key === k)!;
    expect(line("land")).toMatchObject({ amount: 2_000_000, basis: "QUOTED" });
    expect(line("registration").amount).toBe(140_000);
    expect(line("construction").amount).toBe(2_000_000);
    // contingency = 5% of (50k + 150k + 2m + 80k + 10k + 40k)
    expect(line("contingency").amount).toBe(116_500);
    expect(e.total).toBe(e.lines.reduce((s, l) => s + (l.amount ?? 0), 0));
    expect(e.complete).toBe(true);
  });

  it("never invents numbers without a rate card or price", () => {
    const e = estimateBudget({ quotedLandPrice: null, builtUpSqft: 1000, footprintSqft: 500, gardenSqft: 0, parkingSlots: 0, card: null, overrides: {} });
    expect(e.complete).toBe(false);
    expect(e.lines.find((l) => l.key === "construction")?.basis).toBe("MISSING");
    expect(e.lines.find((l) => l.key === "land")?.amount).toBeNull();
  });

  it("uses the customer's own figures when given", () => {
    const e = estimateBudget({ quotedLandPrice: null, builtUpSqft: 1000, footprintSqft: 500, gardenSqft: 0, parkingSlots: 0, card, overrides: { land: 1_500_000 } });
    expect(e.lines[0]).toMatchObject({ amount: 1_500_000, basis: "USER" });
  });
});

const base: MatchProperty = {
  id: "1", slug: "p1", title: "Plot", referenceCode: "VDP-1", kind: "land", availability: "AVAILABLE", price: 2_500_000, locationSlug: "north", locationName: "North",
  landAreaSqft: 1200, builtUpAreaSqft: null, bedrooms: null, plotWidthFt: 30, plotDepthFt: 40, setbacks: { front: null, rear: null, side: null }, maxCoveragePct: null,
  amenityNames: ["Water supply", "Electricity connection"], facilities: [], completeness: 0.8, passportReviewed: 0, passportTotal: 0,
};

describe("PlotFit", () => {
  it("excludes sold, over-budget and wrong-type properties with reasons", () => {
    const c = parseCriteria({ budget: "5000000", reservePct: "50", type: "land" });
    const r = matchProperties(
      [base, { ...base, id: "2", referenceCode: "VDP-2", availability: "SOLD" }, { ...base, id: "3", referenceCode: "VDP-3", price: 3_000_000 }, { ...base, id: "4", referenceCode: "VDP-4", kind: "home" }],
      c,
    );
    expect(r.matches.map((m) => m.property.id)).toEqual(["1"]);
    expect(r.excluded.map((e) => e.reason).join(" ")).toMatch(/No longer available.*above.*Not land/);
  });

  it("puts unpriced properties in needs-information, never in matches", () => {
    const r = matchProperties([{ ...base, price: null }], parseCriteria({ budget: "4000000" }));
    expect(r.matches).toHaveLength(0);
    expect(r.needsInfo[0].unknowns[0]).toMatch(/price isn't published/);
  });

  it("explains location fit and compromises", () => {
    const r = matchProperties([base, { ...base, id: "2", referenceCode: "VDP-2", locationSlug: "east", locationName: "East" }], parseCriteria({ locations: "north" }));
    expect(r.matches[0].property.id).toBe("1");
    expect(r.matches[0].reasons.join(" ")).toMatch(/preferred locations/);
    expect(r.matches[1].compromises.join(" ")).toMatch(/didn't select/);
  });

  it("checks house fit using the layout engine and flags assumed setbacks", () => {
    const r = matchProperties([base], parseCriteria({ builtUp: "1400", bedrooms: "3" }));
    expect(r.matches[0].reasons.join(" ")).toMatch(/fits on the 30 × 40 ft plot/);
    expect(r.matches[0].unknowns.join(" ")).toMatch(/Setbacks/);
  });

  it("serialises criteria to a shareable query", () => {
    expect(criteriaToQuery(parseCriteria({ budget: "5000000", locations: "a,b", garden: "1" }))).toBe("budget=5000000&locations=a%2Cb&garden=1");
  });
});
