import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, PageIntro, SampleTag } from "@/components/site/ui";
import { MapView } from "@/components/twin/MapView";
import { db } from "@/lib/db";
import { alternates, getI18n } from "@/i18n/server";
import { completeness } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.twin.index.meta, description: t.twin.index.desc, alternates: await alternates("/twin") };
}

export default async function TwinIndex() {
  const { t, f } = await getI18n();
  const x = t.twin.index;
  const rows = await db.property.findMany({
    where: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } },
    include: {
      location: true,
      amenities: { select: { id: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" }, where: { kind: "PHOTO" } },
      passport: { where: { customerVisible: true }, select: { status: true } },
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
  });
  const pins = rows.filter((r) => r.showExactLocation && r.latitude !== null && r.longitude !== null);

  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.eyebrow }]}>
        {x.intro}
      </PageIntro>
      <div className="wrap py-12">
        {pins.length > 0 && (
          <section className="mb-14" aria-labelledby="tm-h">
            <h2 id="tm-h" className="annot text-emerald">{x.mapped}</h2>
            <div className="mt-4">
              <MapView label={x.mapLabel} pins={pins.map((r) => ({ lat: r.latitude!, lng: r.longitude!, label: `${r.referenceCode} · ${r.title}`, href: `/twin/${r.slug}`, status: r.availability }))} />
            </div>
            <p className="mt-2 text-sm text-slate">{x.mappedNote(pins.length, rows.length)}</p>
          </section>
        )}
        <ul className="grid gap-6 md:grid-cols-2">
          {rows.map((r) => {
            const score = Math.round(completeness(r as unknown as Record<string, unknown>) * 100);
            const reviewed = r.passport.filter((x) => x.status === "REVIEWED").length;
            return (
              <li key={r.id}>
                <Link href={`/twin/${r.slug}`} className="surface group grid grid-cols-[8rem_1fr] overflow-hidden transition-transform duration-500 hover:-translate-y-1 sm:grid-cols-[11rem_1fr]">
                  <div className="blob-mask relative m-2 min-h-36 bg-paper"><Media src={r.images[0]?.url} alt="" sizes="176px" /></div>
                  <div className="p-5">
                    <p className="annot-plain text-slate">{x.twinOf(r.referenceCode)}</p>
                    <p className="mt-2 font-serif text-2xl leading-tight text-navy group-hover:text-emerald">{r.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AvailabilityBadge value={r.availability} />
                      {r.isSample && <SampleTag />}
                      <span className="text-xs text-slate">{t.labels.propertyType[r.type]} · {r.localityLabel ?? r.location?.name}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div><dt className="text-slate">{x.record}</dt><dd className="font-semibold">{score}%</dd></div>
                      <div><dt className="text-slate">{x.docsReviewed}</dt><dd className="font-semibold">{reviewed}/{r.passport.length}</dd></div>
                      <div><dt className="text-slate">{x.price}</dt><dd className="font-semibold">{r.publicPrice !== null ? f.price(Number(r.publicPrice)) : t.price.onRequestShort}</dd></div>
                    </dl>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="text-slate">{x.empty}</p>}
      </div>
    </>
  );
}
