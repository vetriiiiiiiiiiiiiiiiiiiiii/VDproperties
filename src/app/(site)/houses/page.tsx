import type { Metadata } from "next";
import { ListingView } from "@/components/property/ListingView";
import { PageIntro } from "@/components/site/ui";
import { hasActiveFilters, parseSearchParams, type RawSearchParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const filtered = hasActiveFilters(parseSearchParams(await searchParams));
  return {
    title: "Houses & Villas",
    description: "Completed houses and villas for sale from V D Properties, with built-up area, bedrooms and specifications.",
    alternates: { canonical: "/houses" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function HousesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <>
      <PageIntro eyebrow="Homes" title="Houses & villas" crumbs={[{ label: "Buy properties", href: "/properties" }, { label: "Houses & villas" }]}>
        Homes ready to move into, with their plot, built-up area and specification set out clearly.
      </PageIntro>
      <ListingView path="/houses" raw={await searchParams} scope="homes" />
    </>
  );
}
