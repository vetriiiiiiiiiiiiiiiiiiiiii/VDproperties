import type { Metadata } from "next";
import { ListingView } from "@/components/property/ListingView";
import { PageIntro } from "@/components/site/ui";
import { hasActiveFilters, parseSearchParams, type RawSearchParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const filtered = hasActiveFilters(parseSearchParams(await searchParams));
  return {
    title: "Residential Plots & Land",
    description: "Residential plots and land parcels from V D Properties, with plot dimensions, land area, road access and infrastructure for each listing.",
    alternates: { canonical: "/plots" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PlotsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageIntro eyebrow="Land & plots" title="Residential plots & land" crumbs={[{ label: "Buy properties", href: "/properties" }, { label: "Plots & land" }]}>
        Plots within layouts and open land parcels. Each listing records its dimensions, area, access and infrastructure — and only the details that have been verified.
      </PageIntro>
      <ListingView path="/plots" raw={await searchParams} scope="land" />
    </>
  );
}
