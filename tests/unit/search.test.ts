import { describe, expect, it } from "vitest";
import { buildPropertyOrderBy, buildPropertyWhere, hasActiveFilters, parseSearchParams, toQueryString } from "@/lib/search";

describe("parseSearchParams", () => {
  it("ignores blank and malformed values instead of failing", () => {
    const f = parseSearchParams({ q: "", minPrice: "abc", beds: "-2", type: "CASTLE", location: "Bad Slug!", sort: "random", page: "0" });
    expect(f).toEqual({});
  });

  it("parses valid filters and amenity lists", () => {
    const f = parseSearchParams({ category: "land", minLand: "1000", amenities: "paved-road,water-supply", sort: "price_asc", page: "2" });
    expect(f).toMatchObject({ category: "land", minLand: 1000, amenities: ["paved-road", "water-supply"], sort: "price_asc", page: 2 });
  });

  it("swaps reversed ranges", () => {
    const f = parseSearchParams({ minPrice: "5000000", maxPrice: "1000000" });
    expect(f.minPrice).toBe(1000000);
    expect(f.maxPrice).toBe(5000000);
  });

  it("applies page presets over URL values", () => {
    expect(parseSearchParams({ category: "homes" }, { category: "land" }).category).toBe("land");
  });
});

describe("buildPropertyWhere", () => {
  const and = (f: Parameters<typeof buildPropertyWhere>[0]) => (buildPropertyWhere(f).AND as object[]) ?? [];

  it("always restricts to published listings and hides sold ones by default", () => {
    const clauses = and({});
    expect(clauses).toContainEqual({ publication: "PUBLISHED" });
    expect(clauses).toContainEqual({ availability: { in: ["AVAILABLE", "RESERVED"] } });
  });

  it("filters budget only on publicly shown prices", () => {
    const clause = and({ maxPrice: 5000000 }).find((c) => "publicPrice" in c) as { publicPrice: Record<string, unknown> };
    expect(clause.publicPrice).toEqual({ not: null, lte: 5000000n });
  });

  it("requires every selected amenity", () => {
    const clauses = and({ amenities: ["a", "b"] });
    expect(clauses).toContainEqual({ amenities: { some: { slug: "a" } } });
    expect(clauses).toContainEqual({ amenities: { some: { slug: "b" } } });
  });

  it("maps categories to property types", () => {
    expect(and({ category: "homes" })).toContainEqual({ type: { in: ["HOUSE", "VILLA"] } });
    expect(and({ category: "land", type: "LAND" })).toContainEqual({ type: "LAND" });
  });
});

describe("query strings", () => {
  it("round-trips filters and omits defaults", () => {
    const f = parseSearchParams({ location: "north-zone", maxPrice: "5000000" });
    expect(toQueryString(f)).toBe("?location=north-zone&maxPrice=5000000");
    expect(parseSearchParams(Object.fromEntries(new URLSearchParams(toQueryString(f))))).toEqual(f);
    expect(toQueryString({ ...f, page: 1 })).toBe("?location=north-zone&maxPrice=5000000");
  });

  it("knows when filters are active", () => {
    expect(hasActiveFilters({ sort: "price_asc", page: 3 })).toBe(false);
    expect(hasActiveFilters({ beds: 2 })).toBe(true);
  });

  it("sorts unpriced listings last", () => {
    expect(buildPropertyOrderBy("price_asc")[0]).toEqual({ publicPrice: { sort: "asc", nulls: "last" } });
  });
});
