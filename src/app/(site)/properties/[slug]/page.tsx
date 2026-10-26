import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyDetailView } from "@/components/property/PropertyDetailView";
import { getPublishedProperty } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPublishedProperty((await params).slug);
  if (!p) return { title: "Property not found", robots: { index: false } };
  const place = p.localityLabel ?? p.location?.name;
  const description = p.seoDescription ?? p.summary ?? `${p.title}${place ? ` in ${place}` : ""} — listing ${p.referenceCode} from V D Properties.`;
  const photo = p.images.find((i) => i.kind === "PHOTO" && !i.url.startsWith("placeholder:"));
  const closed = p.availability === "SOLD" || p.availability === "UNAVAILABLE" || p.isSample;
  return {
    title: p.seoTitle ?? `${p.title}${place ? `, ${place}` : ""}`,
    description,
    alternates: { canonical: `/properties/${p.slug}` },
    // Sold, unavailable and sample listings stay reachable for existing links but are kept out of search indexes.
    robots: closed ? { index: false, follow: true } : undefined,
    openGraph: { title: p.title, description, type: "website", ...(photo && { images: [{ url: photo.url, alt: photo.alt }] }) },
  };
}

export default async function PropertyPage({ params }: Props) {
  const p = await getPublishedProperty((await params).slug);
  if (!p) notFound();
  return <PropertyDetailView p={p} />;
}
