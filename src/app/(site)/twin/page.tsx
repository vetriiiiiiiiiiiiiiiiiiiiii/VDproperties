import type { Metadata } from "next";
import Link from "next/link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, PageIntro, SampleTag } from "@/components/site/ui";
import { MapView } from "@/components/twin/MapView";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { completeness } from "@/lib/platform";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Property Twin",
  description: "Digital property records: mapped locations, recorded facts, document registers and history for V D Properties listings.",
  alternates: { canonical: "/twin" },
};

export default async function TwinIndex() {
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
      <PageIntro eyebrow="Property Twin" title="Every property, as a complete record" crumbs={[{ label: "Property Twin" }]}>
        Each Twin brings together a property's mapped location, recorded facts, document register, surroundings and history — and shows plainly what isn't known yet.
      </PageIntro>
      <div className="wrap py-12">
        {pins.length > 0 && (
          <section className="mb-14" aria-labelledby="tm-h">
            <h2 id="tm-h" className="annot text-emerald">Mapped properties</h2>
            <div className="mt-4">
              <MapView label="Map of properties with authorised locations" pins={pins.map((r) => ({ lat: r.latitude!, lng: r.longitude!, label: `${r.referenceCode} · ${r.title}`, href: `/twin/${r.slug}`, status: r.availability }))} />
            </div>
            <p className="mt-2 text-sm text-slate">{pins.length} of {rows.length} properties have an exact location authorised for publication.</p>
          </section>
        )}
        <ul className="grid gap-6 md:grid-cols-2">
          {rows.map((r) => {
            const score = Math.round(completeness(r as unknown as Record<string, unknown>) * 100);
            const reviewed = r.passport.filter((x) => x.status === "REVIEWED").length;
            return (
              <li key={r.id}>
                <Link href={`/twin/${r.slug}`} className="group grid grid-cols-[8rem_1fr] border border-line bg-white transition-colors hover:border-emerald sm:grid-cols-[11rem_1fr]">
                  <div className="relative min-h-36 overflow-hidden bg-paper"><Media src={r.images[0]?.url} alt="" sizes="176px" /></div>
                  <div className="p-5">
                    <p className="annot-plain text-slate">Twin · {r.referenceCode}</p>
                    <p className="mt-2 font-serif text-2xl leading-tight text-navy group-hover:text-emerald">{r.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AvailabilityBadge value={r.availability} />
                      {r.isSample && <SampleTag />}
                      <span className="text-xs text-slate">{PROPERTY_TYPE_LABEL[r.type]} · {r.localityLabel ?? r.location?.name}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div><dt className="text-slate">Record</dt><dd className="font-semibold">{score}%</dd></div>
                      <div><dt className="text-slate">Documents reviewed</dt><dd className="font-semibold">{reviewed}/{r.passport.length}</dd></div>
                      <div><dt className="text-slate">Price</dt><dd className="font-semibold">{r.publicPrice !== null ? formatPrice(Number(r.publicPrice)) : "On request"}</dd></div>
                    </dl>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="text-slate">Property records will appear here as listings are published.</p>}
      </div>
    </>
  );
}
