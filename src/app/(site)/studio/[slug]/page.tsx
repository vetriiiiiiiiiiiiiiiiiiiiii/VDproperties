import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { StudioPlanner } from "@/components/studio/StudioPlanner";
import { Breadcrumbs, SampleTag } from "@/components/site/ui";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { plotFromProperty } from "@/lib/platform";
import { getSettings } from "@/lib/settings";
import { cardsFor } from "@/lib/studio/cards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.property.findFirst({ where: { slug: (await params).slug, publication: "PUBLISHED" }, select: { title: true, referenceCode: true } });
  const { t } = await getI18n();
  return p ? { title: t.studio.property.metaTitle(p.title), robots: { index: false } } : { title: t.studio.index.eyebrow };
}

export default async function StudioPropertyPage({ params }: Props) {
  const p = await db.property.findFirst({ where: { slug: (await params).slug, publication: "PUBLISHED" } });
  if (!p) notFound();
  const { t } = await getI18n();
  const x = t.studio.property;
  const plot = plotFromProperty(p);
  const [user, settings, cards] = await Promise.all([getCurrentUser(), getSettings(), cardsFor(p.locationId)]);
  const open = p.availability === "AVAILABLE" || p.availability === "RESERVED";

  return (
    <div className="wrap py-8">
      <Breadcrumbs items={[{ label: t.studio.index.eyebrow, href: "/studio" }, { label: p.referenceCode }]} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="annot text-emerald">{x.eyebrow(p.referenceCode)}</p>
          <h1 className="mt-3 text-4xl text-navy sm:text-5xl">{p.title}</h1>
          {p.isSample && <SampleTag className="mt-3" />}
        </div>
        <Link href={`/twin/${p.slug}`} className="link-arrow text-emerald">{x.back}</Link>
      </header>
      {!open && <p className="surface mt-6 border-l-4 border-terracotta p-4 text-sm">{x.unavailable(t.labels.availability[p.availability].toLocaleLowerCase())}</p>}
      <div className="mt-8">
        {plot ? (
          <StudioPlanner
            property={{ id: p.id, slug: p.slug, referenceCode: p.referenceCode, title: p.title, price: p.publicPrice === null ? null : Number(p.publicPrice), availability: p.availability, constraints: p.siteConstraints, isSample: p.isSample }}
            basePlot={plot}
            cards={cards}
            signedIn={user?.role === "CUSTOMER"}
            businessName={settings.businessName}
          />
        ) : (
          <div className="rounded-[1rem] border border-dashed border-line bg-white/70 p-8">
            <p className="font-serif text-2xl text-navy">{x.noDims}</p>
            <p className="mt-2 text-slate">{x.noDimsBody}</p>
            <Link href={`/studio/illustrative?w=30&d=40${p.publicPrice !== null ? `&price=${p.publicPrice}` : ""}`} className="btn btn-primary mt-5">{x.useIllustrative}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
