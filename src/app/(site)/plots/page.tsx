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
    title: t.listings.pages.plots.meta,
    description: t.listings.pages.plots.desc,
    alternates: await alternates("/plots"),
    // Filtered permutations aren't indexed, which avoids thin duplicate pages.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PlotsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const { t } = await getI18n();
  const x = t.listings.pages.plots;
  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: t.listings.pages.all.crumb, href: "/properties" }, { label: x.crumb }]}>
        {x.intro}
      </PageIntro>
      <ListingView path="/plots" raw={await searchParams} scope="land" />
    </>
  );
}
