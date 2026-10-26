import type { Metadata } from "next";
import { StudioPlanner } from "@/components/studio/StudioPlanner";
import { Breadcrumbs } from "@/components/site/ui";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cardsFor } from "@/lib/studio/cards";
import { assumedSetbacks } from "@/lib/studio/layout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Property Studio · Illustrative plot", robots: { index: false } };

export default async function IllustrativeStudio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const clamp = (v: string | undefined, d: number) => Math.min(1000, Math.max(10, Number(v) || d));
  const w = clamp(sp.w, 30);
  const d = clamp(sp.d, 40);
  const [user, settings, cards] = await Promise.all([getCurrentUser(), getSettings(), cardsFor(null)]);
  return (
    <div className="wrap py-8">
      <Breadcrumbs items={[{ label: "Property Studio", href: "/studio" }, { label: "Illustrative plot" }]} />
      <header className="mt-6 border-b border-line pb-6">
        <p className="annot text-gold-deep">Property Studio · illustrative plot</p>
        <h1 className="mt-3 text-4xl text-navy sm:text-5xl">{w} × {d} ft plot you described</h1>
        <p className="mt-2 max-w-2xl text-slate">This isn't a surveyed property. Dimensions and setbacks are yours to set — confirm them with a surveyor and the local planning authority before relying on any concept.</p>
      </header>
      <div className="mt-8">
        <StudioPlanner
          property={null}
          basePlot={{ widthFt: w, depthFt: d, setbacks: assumedSetbacks(w, d), setbackSource: "ASSUMED", maxCoveragePct: null, coverageSource: null, frontBearing: null, illustrative: true }}
          cards={cards}
          signedIn={user?.role === "CUSTOMER"}
          businessName={settings.businessName}
          initialLandPrice={sp.price && Number(sp.price) > 0 ? Math.min(Number(sp.price), 1e11) : null}
        />
      </div>
    </div>
  );
}
