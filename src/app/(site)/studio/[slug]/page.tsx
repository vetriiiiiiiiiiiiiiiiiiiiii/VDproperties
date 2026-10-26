import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioPlanner } from "@/components/studio/StudioPlanner";
import { Breadcrumbs, SampleTag } from "@/components/site/ui";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { plotFromProperty } from "@/lib/platform";
import { getSettings } from "@/lib/settings";
import { cardsFor } from "@/lib/studio/cards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.property.findFirst({ where: { slug: (await params).slug, publication: "PUBLISHED" }, select: { title: true, referenceCode: true } });
  return p ? { title: `Property Studio · ${p.title}`, robots: { index: false } } : { title: "Property Studio" };
}

export default async function StudioPropertyPage({ params }: Props) {
  const p = await db.property.findFirst({ where: { slug: (await params).slug, publication: "PUBLISHED" } });
  if (!p) notFound();
  const plot = plotFromProperty(p);
  const [user, settings, cards] = await Promise.all([getCurrentUser(), getSettings(), cardsFor(p.locationId)]);
  const open = p.availability === "AVAILABLE" || p.availability === "RESERVED";

  return (
    <div className="wrap py-8">
      <Breadcrumbs items={[{ label: "Property Studio", href: "/studio" }, { label: p.referenceCode }]} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="annot text-emerald">Property Studio · planning on {p.referenceCode}</p>
          <h1 className="mt-3 text-4xl text-navy sm:text-5xl">{p.title}</h1>
          {p.isSample && <SampleTag className="mt-3" />}
        </div>
        <Link href={`/twin/${p.slug}`} className="link-arrow text-emerald">Back to the Property Twin</Link>
      </header>
      {!open && <p className="mt-6 border-l-4 border-terracotta bg-white p-4 text-sm">This property is {p.availability.toLowerCase()}. You can still explore concepts, but it can't be purchased.</p>}
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
          <div className="border border-dashed border-line bg-white p-8">
            <p className="font-serif text-2xl text-navy">This property's plot dimensions aren't on record yet.</p>
            <p className="mt-2 text-slate">We won't guess survey measurements. If you know the plot size, plan on an illustrative plot instead — it'll be clearly labelled as such.</p>
            <Link href={`/studio/illustrative?w=30&d=40${p.publicPrice !== null ? `&price=${p.publicPrice}` : ""}`} className="btn btn-primary mt-5">Use an illustrative plot</Link>
          </div>
        )}
      </div>
    </div>
  );
}
