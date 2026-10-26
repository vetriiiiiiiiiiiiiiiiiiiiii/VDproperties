import type { Metadata } from "next";
import { PlotFitWizard } from "@/components/plotfit/PlotFitWizard";
import { Breadcrumbs } from "@/components/site/ui";
import { db } from "@/lib/db";
import { parseCriteria } from "@/lib/plotfit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PlotFit — Find My Property",
  description: "Answer a few questions about your budget, location and the home you want. PlotFit matches you with available plots and houses — and explains every match.",
  alternates: { canonical: "/plotfit" },
};

export default async function PlotFitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const locations = await db.location.findMany({
    where: { properties: { some: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } } } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-10 hidden h-80 w-80 rounded-full bg-sun opacity-60 lg:block" />
      <div className="wrap relative py-10 lg:py-16">
        <Breadcrumbs items={[{ label: "PlotFit" }]} />
        <header className="mx-auto mt-8 max-w-3xl">
          <p className="annot text-emerald">PlotFit</p>
          <h1 className="mt-4 text-headline text-navy">Find the property that fits the life you're planning.</h1>
          <p className="mt-4 text-lg text-slate">Nine short questions — skip any that don't matter. Matches are ranked only on how well they fit you, with every reason and compromise spelled out.</p>
        </header>
        <div className="mt-10">
          <PlotFitWizard locations={locations} initial={Object.keys(sp).length ? parseCriteria(sp) : undefined} />
        </div>
      </div>
    </div>
  );
}
