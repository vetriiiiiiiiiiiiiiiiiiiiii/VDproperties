import type { Metadata } from "next";
import { ListingView } from "@/components/property/ListingView";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { hasActiveFilters, parseSearchParams, type RawSearchParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const { t } = await getI18n();
  const filtered = hasActiveFilters(parseSearchParams(await searchParams));
  return {
    title: t.listings.pages.all.meta,
    description: t.listings.pages.all.desc,
    alternates: await alternates("/properties"),
    // Filtered permutations aren't indexed, which avoids thin duplicate pages.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const { t } = await getI18n();
  const x = t.listings.pages.all;
  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.crumb }]}>
        {x.intro}
      </PageIntro>
      <ListingView path="/properties" raw={await searchParams} scope="all" />
    </>
  );
}
