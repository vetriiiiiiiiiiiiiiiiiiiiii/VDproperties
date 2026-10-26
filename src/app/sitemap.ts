import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl, allowIndexing } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Lists only real, published, open listings and projects — no sample, sold, draft or filtered pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!allowIndexing) return [];
  const [properties, projects] = await Promise.all([
    db.property.findMany({
      where: { publication: "PUBLISHED", isSample: false, availability: { in: ["AVAILABLE", "RESERVED"] } },
      select: { slug: true, updatedAt: true },
    }),
    db.project.findMany({ where: { publication: "PUBLISHED", isSample: false }, select: { slug: true, updatedAt: true } }),
  ]);
  const pages = ["/", "/properties", "/plots", "/houses", "/projects/ongoing", "/projects/completed", "/construction", "/about", "/contact", "/site-visit", "/faqs", "/privacy", "/terms"];
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...properties.map((p) => ({ url: absoluteUrl(`/properties/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
    ...projects.map((p) => ({ url: absoluteUrl(`/projects/${p.slug}`), lastModified: p.updatedAt, priority: 0.6 })),
  ];
}
