import type { Metadata } from "next";
import { ListingView } from "@/components/property/ListingView";
import { PageIntro } from "@/components/site/ui";
import { hasActiveFilters, parseSearchParams, type RawSearchParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const filtered = hasActiveFilters(parseSearchParams(await searchParams));
  return {
    title: "Buy Properties",
    description: "Search residential plots, land, houses and villas from V D Properties by location, budget, area and availability.",
    alternates: { canonical: "/properties" },
    // Filtered permutations aren't indexed, which avoids thin duplicate pages.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageIntro eyebrow="Property search" title="Properties for sale" crumbs={[{ label: "Buy properties" }]}>
        Every published listing — residential plots, land, houses and villas. Filter by what matters to you; the link updates so you can share your search.
      </PageIntro>
      <ListingView path="/properties" raw={await searchParams} scope="all" />
    </>
  );
}
