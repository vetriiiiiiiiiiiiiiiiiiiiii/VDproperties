import type { Availability, Prisma, ProjectStatus, PropertyType } from "@prisma/client";
import { z } from "zod";
import { HOME_TYPES, LAND_TYPES } from "./labels";

export const PAGE_SIZE = 9;

/** Budget presets offered in quick-search controls (upper bound in rupees). */
export const BUDGETS: [number, string][] = [
  [2500000, "Up to ₹25 lakh"],
  [5000000, "Up to ₹50 lakh"],
  [10000000, "Up to ₹1 crore"],
  [20000000, "Up to ₹2 crore"],
];

export const SORT_OPTIONS = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  area_desc: "Area: largest first",
  area_asc: "Area: smallest first",
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

export const CATEGORY_OPTIONS = {
  land: "Residential land & plots",
  homes: "Houses & villas",
  project: "In a development",
} as const;
export type CategoryKey = keyof typeof CATEGORY_OPTIONS;

export const AVAILABILITY_OPTIONS = {
  current: "Available or reserved",
  available: "Available only",
  all: "Include sold",
} as const;
export type AvailabilityKey = keyof typeof AVAILABILITY_OPTIONS;

const blankToUndefined = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);

const amount = z.preprocess(blankToUndefined, z.coerce.number().finite().min(0).max(1e13).optional()).catch(undefined);
const count = z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(50).optional()).catch(undefined);
const slug = z.preprocess(blankToUndefined, z.string().max(80).regex(/^[a-z0-9-]+$/).optional()).catch(undefined);

const PROPERTY_TYPES = ["RESIDENTIAL_PLOT", "LAND", "HOUSE", "VILLA"] as const satisfies readonly PropertyType[];
const PROJECT_STATUSES = ["UPCOMING", "ONGOING", "COMPLETED"] as const satisfies readonly ProjectStatus[];

export const searchSchema = z.object({
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()).catch(undefined),
  category: z.preprocess(blankToUndefined, z.enum(["land", "homes", "project"]).optional()).catch(undefined),
  type: z.preprocess(blankToUndefined, z.enum(PROPERTY_TYPES).optional()).catch(undefined),
  location: slug,
  minPrice: amount,
  maxPrice: amount,
  minLand: amount,
  maxLand: amount,
  minBuilt: amount,
  maxBuilt: amount,
  beds: count,
  availability: z.preprocess(blankToUndefined, z.enum(["current", "available", "all"]).optional()).catch(undefined),
  projectStatus: z.preprocess(blankToUndefined, z.enum(PROJECT_STATUSES).optional()).catch(undefined),
  amenities: z
    .preprocess(
      (v) => (typeof v === "string" && v ? v.split(",") : undefined),
      z.array(z.string().regex(/^[a-z0-9-]+$/).max(80)).max(20).optional(),
    )
    .catch(undefined),
  sort: z.preprocess(blankToUndefined, z.enum(["newest", "price_asc", "price_desc", "area_desc", "area_asc"]).optional()).catch(undefined),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(1000).optional()).catch(undefined),
});

export type SearchFilters = z.infer<typeof searchSchema>;
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(raw: RawSearchParams, preset: Partial<SearchFilters> = {}): SearchFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  const parsed = searchSchema.parse(flat);
  const filters = { ...parsed, ...stripUndefined(preset) };
  // A reversed range is almost always a typo; swap rather than return nothing.
  swapIfReversed(filters, "minPrice", "maxPrice");
  swapIfReversed(filters, "minLand", "maxLand");
  swapIfReversed(filters, "minBuilt", "maxBuilt");
  return filters;
}

function swapIfReversed(f: SearchFilters, a: "minPrice" | "minLand" | "minBuilt", b: "maxPrice" | "maxLand" | "maxBuilt") {
  const lo = f[a];
  const hi = f[b];
  if (lo !== undefined && hi !== undefined && lo > hi) {
    f[a] = hi;
    f[b] = lo;
  }
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function buildPropertyWhere(f: SearchFilters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [{ publication: "PUBLISHED" }];

  const availability: Record<AvailabilityKey, Availability[]> = {
    current: ["AVAILABLE", "RESERVED"],
    available: ["AVAILABLE"],
    all: ["AVAILABLE", "RESERVED", "SOLD"],
  };
  and.push({ availability: { in: availability[f.availability ?? "current"] } });

  if (f.type) and.push({ type: f.type });
  else if (f.category === "land") and.push({ type: { in: LAND_TYPES } });
  else if (f.category === "homes") and.push({ type: { in: HOME_TYPES } });
  if (f.category === "project") and.push({ projectId: { not: null }, project: { publication: "PUBLISHED" } });

  if (f.location) and.push({ location: { slug: f.location } });

  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { summary: contains },
        { localityLabel: contains },
        { location: { name: contains } },
        { location: { city: contains } },
        { referenceCode: { equals: f.q.toUpperCase() } },
      ],
    });
  }

  // Budget filters only use prices the company has chosen to publish.
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    and.push({
      publicPrice: {
        not: null,
        ...(f.minPrice !== undefined && { gte: BigInt(Math.floor(f.minPrice)) }),
        ...(f.maxPrice !== undefined && { lte: BigInt(Math.ceil(f.maxPrice)) }),
      },
    });
  }
  if (f.minLand !== undefined) and.push({ landAreaSqft: { gte: f.minLand } });
  if (f.maxLand !== undefined) and.push({ landAreaSqft: { lte: f.maxLand } });
  if (f.minBuilt !== undefined) and.push({ builtUpAreaSqft: { gte: f.minBuilt } });
  if (f.maxBuilt !== undefined) and.push({ builtUpAreaSqft: { lte: f.maxBuilt } });
  if (f.beds !== undefined && f.beds > 0) and.push({ bedrooms: { gte: f.beds } });
  if (f.projectStatus) and.push({ project: { status: f.projectStatus, publication: "PUBLISHED" } });
  for (const a of f.amenities ?? []) and.push({ amenities: { some: { slug: a } } });

  return { AND: and };
}

export function buildPropertyOrderBy(sort: SortKey | undefined): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ publicPrice: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }];
    case "price_desc":
      return [{ publicPrice: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }];
    case "area_asc":
      return [{ primaryAreaSqft: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }];
    case "area_desc":
      return [{ primaryAreaSqft: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }];
    default:
      return [{ featured: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  }
}

const PARAM_ORDER: (keyof SearchFilters)[] = [
  "q", "category", "type", "location", "minPrice", "maxPrice", "minLand", "maxLand",
  "minBuilt", "maxBuilt", "beds", "availability", "projectStatus", "amenities", "sort", "page",
];

/** Serialises filters back into a stable query string, omitting defaults. */
export function toQueryString(f: SearchFilters, omit: (keyof SearchFilters)[] = []) {
  const p = new URLSearchParams();
  for (const key of PARAM_ORDER) {
    if (omit.includes(key)) continue;
    const v = f[key];
    if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
    if (key === "page" && v === 1) continue;
    p.set(key, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: SearchFilters, ignore: (keyof SearchFilters)[] = []) {
  return PARAM_ORDER.some((k) => !["sort", "page", ...ignore].includes(k) && f[k] !== undefined && !(Array.isArray(f[k]) && (f[k] as unknown[]).length === 0));
}
