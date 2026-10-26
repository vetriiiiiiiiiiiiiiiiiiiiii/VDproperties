import type { Metadata } from "next";
import { PlotFitWizard } from "@/components/plotfit/PlotFitWizard";
import { Breadcrumbs } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { db } from "@/lib/db";
import { parseCriteria } from "@/lib/plotfit";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.plotfit.meta, description: t.plotfit.desc, alternates: await alternates("/plotfit") };
}

export default async function PlotFitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const locations = await db.location.findMany({
    where: { properties: { some: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } } } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  return (
    <div className="relative overflow-hidden">
      <div className="wrap relative py-10 lg:py-16">
        <Breadcrumbs items={[{ label: "PlotFit" }]} />
        <header className="mx-auto mt-8 max-w-3xl">
          <p className="annot text-emerald">{t.plotfit.eyebrow}</p>
          <h1 className="mt-4 text-headline text-navy">{t.plotfit.title}</h1>
          <p className="mt-4 text-lg text-slate">{t.plotfit.intro}</p>
        </header>
        <div className="mt-10">
          <PlotFitWizard locations={locations} initial={Object.keys(sp).length ? parseCriteria(sp) : undefined} />
        </div>
      </div>
    </div>
  );
}
