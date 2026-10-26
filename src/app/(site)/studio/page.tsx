import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, PageIntro, SampleTag } from "@/components/site/ui";
import { db } from "@/lib/db";
import { alternates, getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.studio.index.meta, description: t.studio.index.desc, alternates: await alternates("/studio") };
}

export default async function StudioIndex() {
  const { t, f, href } = await getI18n();
  const x = t.studio.index;
  const plots = await db.property.findMany({
    where: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] }, plotWidthFt: { not: null }, plotDepthFt: { not: null }, type: { in: ["RESIDENTIAL_PLOT", "LAND"] } },
    include: { location: true, images: { take: 1, orderBy: { sortOrder: "asc" }, where: { kind: "PHOTO" } } },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
  });
  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.eyebrow }]}>
        {x.intro}
      </PageIntro>
      <div className="wrap grid gap-10 py-12 lg:grid-cols-12">
        <section className="lg:col-span-8" aria-labelledby="pick-h">
          <h2 id="pick-h" className="annot text-emerald">{x.choose}</h2>
          {plots.length ? (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2">
              {plots.map((p) => (
                <li key={p.id}>
                  <Link href={`/studio/${p.slug}`} className="surface group block overflow-hidden p-2 transition-transform duration-500 hover:-translate-y-1">
                    <div className="blob-mask relative aspect-[16/9] bg-paper"><Media src={p.images[0]?.url} alt="" sizes="(min-width:640px) 33vw, 100vw" /></div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2"><AvailabilityBadge value={p.availability} />{p.isSample && <SampleTag />}<span className="annot-plain text-slate">{p.referenceCode}</span></div>
                      <p className="mt-2 font-serif text-2xl text-navy group-hover:text-emerald">{p.title}</p>
                      <p className="mt-1 text-sm text-slate">{p.plotWidthFt} × {p.plotDepthFt} ft · {p.localityLabel ?? p.location?.name} · {p.publicPrice !== null ? f.price(Number(p.publicPrice)) : t.price.priceOnRequest}</p>
                      <span className="link-arrow mt-3 text-emerald">{t.twin.detail.designHome}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-[1rem] border border-dashed border-line bg-white/70 p-6 text-slate">{x.none}</p>
          )}
        </section>
        <aside className="lg:col-span-4" aria-labelledby="ill-h">
          <div className="survey-grid sticky top-28 overflow-hidden rounded-[1rem] bg-navy p-6 text-ivory">
            <h2 id="ill-h" className="annot text-gold-light">{x.describe}</h2>
            <p className="mt-3 text-sm text-ivory/80">{x.describeBody}</p>
            <form action={href("/studio/illustrative")} method="get" className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">{x.frontage}<input name="w" type="number" min={10} max={1000} required defaultValue={30} className="field mt-1" /></label>
                <label className="text-sm">{x.depth}<input name="d" type="number" min={10} max={1000} required defaultValue={40} className="field mt-1" /></label>
              </div>
              <label className="block text-sm">{x.price}<input name="price" type="number" min={0} step={10000} className="field mt-1" placeholder={x.optional} /></label>
              <button className="btn btn-gold w-full">{x.open}</button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
