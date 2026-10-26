import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { PAGE_SIZE, buildPropertyOrderBy, buildPropertyWhere, type SearchFilters } from "./search";

export const cardInclude = {
  location: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1, where: { kind: "PHOTO" } },
  project: { select: { name: true, slug: true, status: true, publication: true } },
} satisfies Prisma.PropertyInclude;

type CardRow = Prisma.PropertyGetPayload<{ include: typeof cardInclude }>;

/** Converts a DB row into a serialisable card model. The private price never leaves the server unless it is public. */
export function toCard(p: CardRow) {
  return {
    id: p.id,
    slug: p.slug,
    referenceCode: p.referenceCode,
    title: p.title,
    summary: p.summary,
    type: p.type,
    availability: p.availability,
    featured: p.featured,
    isSample: p.isSample,
    location: p.location ? { name: p.location.name, city: p.location.city, slug: p.location.slug } : null,
    localityLabel: p.localityLabel,
    price: p.publicPrice === null ? null : Number(p.publicPrice),
    priceNote: p.priceNote,
    landAreaSqft: p.landAreaSqft,
    landAreaLabel: p.landAreaLabel,
    plotDimensions: p.plotDimensions,
    builtUpAreaSqft: p.builtUpAreaSqft,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    project: p.project?.publication === "PUBLISHED" ? { name: p.project.name, slug: p.project.slug, status: p.project.status } : null,
  };
}
export type PropertyCard = ReturnType<typeof toCard>;

export async function searchProperties(filters: SearchFilters) {
  const where = buildPropertyWhere(filters);
  const page = filters.page ?? 1;
  const [total, rows] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: buildPropertyOrderBy(filters.sort),
      include: cardInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), items: rows.map(toCard) };
}

/** Facets drawn from published listings, so the UI never offers a filter the data can't satisfy. */
export const getSearchFacets = cache(async (scope: Prisma.PropertyWhereInput = {}) => {
  const base: Prisma.PropertyWhereInput = { AND: [{ publication: "PUBLISHED" }, scope] };
  const [locations, amenities, homes, land, priced, inProjects] = await Promise.all([
    db.location.findMany({
      where: { properties: { some: base } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, city: true },
    }),
    db.amenity.findMany({ where: { properties: { some: base } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.property.count({ where: { AND: [base, { builtUpAreaSqft: { not: null } }] } }),
    db.property.count({ where: { AND: [base, { landAreaSqft: { not: null } }] } }),
    db.property.count({ where: { AND: [base, { publicPrice: { not: null } }] } }),
    db.project.findMany({
      where: { publication: "PUBLISHED", properties: { some: base } },
      distinct: ["status"],
      select: { status: true },
    }),
  ]);
  const beds = await db.property.findMany({
    where: { AND: [base, { bedrooms: { not: null } }] },
    distinct: ["bedrooms"],
    select: { bedrooms: true },
    orderBy: { bedrooms: "asc" },
  });
  return {
    locations,
    amenities,
    hasBuiltUp: homes > 0,
    hasLandArea: land > 0,
    hasPrices: priced > 0,
    bedroomOptions: beds.map((b) => b.bedrooms!).filter((n) => n > 0),
    projectStatuses: inProjects.map((p) => p.status),
  };
});

export async function getFeaturedProperties(limit = 6) {
  const rows = await db.property.findMany({
    where: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } },
    orderBy: [{ featured: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }],
    include: cardInclude,
    take: limit,
  });
  return rows.map(toCard);
}

export const getPublishedProperty = cache(async (slug: string) => {
  return db.property.findFirst({
    where: { slug, publication: "PUBLISHED" },
    include: {
      location: true,
      amenities: { orderBy: { name: "asc" } },
      images: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      documents: { where: { isPublic: true }, orderBy: { createdAt: "asc" } },
      project: true,
    },
  });
});

export type PropertyDetail = NonNullable<Awaited<ReturnType<typeof getPublishedProperty>>>;

export async function getRelatedProperties(p: { id: string; type: string; locationId: string | null; publicPrice: bigint | null }) {
  const sameKind = p.type === "HOUSE" || p.type === "VILLA" ? ["HOUSE", "VILLA"] : ["RESIDENTIAL_PLOT", "LAND"];
  const rows = await db.property.findMany({
    where: {
      publication: "PUBLISHED",
      availability: { in: ["AVAILABLE", "RESERVED"] },
      id: { not: p.id },
      type: { in: sameKind as never },
    },
    include: cardInclude,
    take: 24,
  });
  // Rank by shared location and closeness in published price.
  const target = p.publicPrice === null ? null : Number(p.publicPrice);
  const scored = rows.map((r) => {
    let score = 0;
    if (p.locationId && r.locationId === p.locationId) score += 2;
    if (target && r.publicPrice !== null) {
      const ratio = Number(r.publicPrice) / target;
      if (ratio > 0.7 && ratio < 1.3) score += 1;
    }
    return { r, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 3).map((s) => toCard(s.r));
}

export async function getPublishedProjects(status?: "UPCOMING" | "ONGOING" | "COMPLETED") {
  return db.project.findMany({
    where: { publication: "PUBLISHED", ...(status && { status }) },
    orderBy: { updatedAt: "desc" },
    include: { location: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, _count: { select: { properties: { where: { publication: "PUBLISHED" } } } } },
  });
}

export const getPublishedProject = cache(async (slug: string) => {
  return db.project.findFirst({
    where: { slug, publication: "PUBLISHED" },
    include: { location: true, images: { orderBy: { sortOrder: "asc" } } },
  });
});

/** Options for the site-visit form's property/project picker. */
export async function getVisitableOptions() {
  const [properties, projects] = await Promise.all([
    db.property.findMany({
      where: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } },
      orderBy: { title: "asc" },
      select: { id: true, title: true, referenceCode: true },
    }),
    db.project.findMany({
      where: { publication: "PUBLISHED", status: { in: ["ONGOING", "UPCOMING", "COMPLETED"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { properties, projects };
}

/** Map pins for a search: only listings whose exact location is authorised for publication. */
export async function searchMapPins(filters: SearchFilters) {
  const where = buildPropertyWhere(filters);
  const [pins, total] = await Promise.all([
    db.property.findMany({
      where: { AND: [where, { showExactLocation: true, latitude: { not: null }, longitude: { not: null } }] },
      select: { slug: true, title: true, referenceCode: true, latitude: true, longitude: true, availability: true, publicPrice: true },
      take: 300,
    }),
    db.property.count({ where }),
  ]);
  return { pins, total };
}
