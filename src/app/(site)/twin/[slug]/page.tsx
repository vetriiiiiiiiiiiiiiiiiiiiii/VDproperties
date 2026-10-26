import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/property/Gallery";
import { AvailabilityBadge, Breadcrumbs, SampleTag } from "@/components/site/ui";
import { MapView } from "@/components/twin/MapView";
import { PlotDiagram } from "@/components/twin/PlotDiagram";
import { SaveButton } from "@/components/twin/SaveButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatArea, formatDate, formatPrice } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, isHomeType } from "@/lib/labels";
import { completeness, PASSPORT_STATUS_LABEL, parseBoundary, parseFacilities, plotFromProperty } from "@/lib/platform";
import { FACILITY_KINDS } from "@/lib/plotfit";
import { isStaff } from "@/lib/rbac";
import { DEFAULT_INPUTS, generateLayout } from "@/lib/studio/layout";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.property.findFirst({
    where: { slug, publication: "PUBLISHED" },
    include: {
      location: true,
      developer: { select: { name: true } },
      project: { select: { name: true, slug: true, publication: true, status: true } },
      amenities: { orderBy: { name: "asc" } },
      images: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      documents: { where: { isPublic: true } },
      passport: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { document: { select: { id: true, isPublic: true } } } },
      activity: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Property Twin not found", robots: { index: false } };
  return {
    title: `Property Twin · ${p.title}`,
    description: `Digital property record for ${p.referenceCode}: mapped location, recorded facts, document register and history.`,
    alternates: { canonical: `/twin/${p.slug}` },
    robots: p.isSample || p.availability === "SOLD" ? { index: false } : undefined,
  };
}

const STATUS_STYLE: Record<keyof typeof PASSPORT_STATUS_LABEL, string> = {
  NOT_PROVIDED: "bg-paper text-slate",
  RECEIVED: "bg-navy/10 text-navy",
  UNDER_REVIEW: "bg-gold/20 text-gold-deep",
  REVIEWED: "bg-emerald text-ivory",
  NEEDS_FOLLOW_UP: "bg-terracotta/15 text-terracotta-deep",
};

export default async function TwinPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  const staff = user ? isStaff(user.role) : false;
  const saved = user && user.role === "CUSTOMER" ? !!(await db.savedProperty.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId: p.id } } })) : false;

  const home = isHomeType(p.type);
  const price = p.publicPrice === null ? null : Number(p.publicPrice);
  const place = [p.localityLabel ?? p.location?.name, p.location?.city].filter(Boolean).join(", ");
  const boundary = parseBoundary(p.boundary);
  const facilities = parseFacilities(p.nearbyFacilities);
  const plot = plotFromProperty(p);
  const exact = p.showExactLocation && p.latitude !== null && p.longitude !== null;
  const open = p.availability === "AVAILABLE" || p.availability === "RESERVED";
  const score = Math.round(completeness(p as unknown as Record<string, unknown>) * 100);
  const passport = p.passport.filter((x) => staff || x.customerVisible);
  const activity = p.activity.filter((a) => staff || a.isPublic);
  const teaser = plot ? generateLayout(plot, DEFAULT_INPUTS) : null;
  const sitePhotos = p.images.filter((i) => i.kind !== "FLOOR_PLAN");

  const facts: [string, string | number | null | undefined][] = [
    ["Property ID", p.referenceCode],
    ["Listing status", p.availability.charAt(0) + p.availability.slice(1).toLowerCase()],
    ["Property type", PROPERTY_TYPE_LABEL[p.type]],
    ["Location", place || null],
    ["Asking price", price !== null ? formatPrice(price) : "On request"],
    ["Land area", p.landAreaLabel ?? (p.landAreaSqft ? formatArea(p.landAreaSqft) : null)],
    ["Dimensions", p.plotWidthFt && p.plotDepthFt ? `${p.plotWidthFt} ft × ${p.plotDepthFt} ft` : p.plotDimensions],
    ["Facing", p.facing],
    ["Built-up area", p.builtUpAreaSqft ? formatArea(p.builtUpAreaSqft) : null],
    ["Bedrooms", p.bedrooms],
    ["Road access", p.accessRoad],
    ["Development status", p.developmentStatus],
    ["Developer", p.developer?.name],
    ["Project", p.project?.publication === "PUBLISHED" ? p.project.name : null],
  ];
  const groups = (["EXISTING", "PROPOSED", "UNCONFIRMED"] as const).map((st) => ({ st, items: facilities.filter((f) => f.status === st) }));
  const unknownKinds = Object.entries(FACILITY_KINDS).filter(([k]) => !facilities.some((f) => f.kind === k));

  return (
    <article className="bg-ivory">
      {/* Dossier header */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="survey-grid absolute inset-0 text-navy" aria-hidden="true" />
        <div className="wrap relative py-10 lg:py-14">
          <Breadcrumbs items={[{ label: "Property Twin", href: "/twin" }, { label: p.referenceCode }]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="annot text-emerald">Property Twin · Digital record {p.referenceCode}</p>
              <h1 className="mt-4 text-headline text-navy">{p.title}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <AvailabilityBadge value={p.availability} />
                {p.isSample && <SampleTag />}
                <span className="annot-plain text-slate">{PROPERTY_TYPE_LABEL[p.type]}{place ? ` · ${place}` : ""}</span>
              </div>
            </div>
            <div className="lg:col-span-4 lg:text-right">
              <p className="font-serif text-4xl text-navy">{price !== null ? formatPrice(price) : <span className="italic text-slate">Price on request</span>}</p>
              <p className="annot-plain mt-2 text-slate">Record completeness {score}%</p>
              <div className="mt-2 h-1.5 w-full bg-line lg:ml-auto lg:w-48" role="img" aria-label={`Record completeness ${score} percent`}>
                <div className="h-full bg-sun" style={{ width: `${score}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/properties/${p.slug}`} className="btn btn-primary">Explore This Property</Link>
            {plot && open && <Link href={`/studio/${p.slug}`} className="btn btn-gold">Open in Property Studio</Link>}
            {open && <Link href={`/site-visit?for=p:${p.id}`} className="btn btn-outline text-navy">Request a Site Visit</Link>}
            <SaveButton propertyId={p.id} saved={saved} signedIn={user?.role === "CUSTOMER"} />
          </div>
          {!open && <p className="mt-6 border-l-4 border-terracotta bg-white p-3 text-sm">This property is {p.availability.toLowerCase()}. Its record is kept for reference.</p>}
        </div>
      </header>

      <div className="wrap grid gap-10 py-12 lg:grid-cols-12">
        {/* A — Map & boundary */}
        <section className="lg:col-span-7" aria-labelledby="map-h">
          <h2 id="map-h" className="annot text-emerald">A · Location & boundary</h2>
          <div className="mt-4">
            {exact ? (
              <>
                <MapView
                  label={`Map of ${p.title}`}
                  pins={[{ lat: p.latitude!, lng: p.longitude!, label: p.title, status: p.availability }]}
                  boundary={boundary.length >= 3 ? boundary : undefined}
                  boundaryStyle={p.boundaryStatus === "SURVEYED" ? "solid" : "dashed"}
                />
                <p className="mt-2 text-sm text-slate">
                  {boundary.length >= 3
                    ? p.boundaryStatus === "SURVEYED"
                      ? `Boundary from survey records${p.boundarySource ? ` (${p.boundarySource})` : ""}. Confirm against the registered documents before purchase.`
                      : "Dashed outline is approximate and for orientation only — it is not a legal survey boundary."
                    : "The pin marks the authorised location. No boundary outline is on record."}
                </p>
              </>
            ) : (
              <div className="border border-dashed border-line bg-white p-6">
                <p className="text-ink">{place || "Location shared on enquiry"}</p>
                <p className="mt-1 text-sm text-slate">The exact location hasn't been authorised for publication. We share it directly when you enquire or arrange a visit.</p>
              </div>
            )}
          </div>
          {p.plotWidthFt && p.plotDepthFt && (
            <figure className="mt-8 flex flex-col items-center border border-line bg-white p-6">
              <PlotDiagram widthFt={p.plotWidthFt} depthFt={p.plotDepthFt} frontBearing={p.frontBearing} road={p.accessRoad} />
              <figcaption className="mt-3 text-center text-xs text-slate">
                Drawn to scale from recorded dimensions{p.frontBearing === null ? "; orientation isn't on record, so no north arrow is shown" : ""}.
              </figcaption>
            </figure>
          )}
        </section>

        {/* B — Facts */}
        <section className="lg:col-span-5" aria-labelledby="facts-h">
          <h2 id="facts-h" className="annot text-emerald">B · Property facts</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line bg-white px-4">
            {facts.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5 text-sm">
                <dt className="text-slate">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {p.siteConstraints && (
            <div className="mt-6 border-l-4 border-gold bg-white p-4 text-sm">
              <p className="annot-plain text-gold-deep">Known site constraints</p>
              <p className="mt-1 whitespace-pre-line text-ink">{p.siteConstraints}</p>
            </div>
          )}
        </section>

        {/* C — Passport */}
        <section className="lg:col-span-12" aria-labelledby="passport-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="passport-h" className="annot text-emerald">C · Property Passport — document register</h2>
            <p className="max-w-xl text-xs text-slate">This register shows which documents we hold and their review status. It is not a guarantee of legal title, regulatory approval or investment safety — have documents checked by your own advocate.</p>
          </div>
          {passport.length ? (
            <div className="mt-4 overflow-x-auto border border-line bg-white">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
                  <tr><th scope="col" className="px-4 py-3">Document</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Reviewed</th><th scope="col" className="px-4 py-3">Notes</th><th scope="col" className="px-4 py-3">Access</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {passport.map((x) => (
                    <tr key={x.id}>
                      <td className="px-4 py-3 font-medium">{x.documentType}</td>
                      <td className="px-4 py-3"><span className={`annot-plain inline-block px-2 py-1 text-[0.6rem] ${STATUS_STYLE[x.status]}`}>{PASSPORT_STATUS_LABEL[x.status]}</span></td>
                      <td className="px-4 py-3 text-slate">{x.reviewedAt ? formatDate(x.reviewedAt) : "—"}</td>
                      <td className="px-4 py-3 text-slate">{x.publicNote ?? "—"}{staff && x.privateNote ? <span className="block text-xs text-terracotta-deep">Staff: {x.privateNote}</span> : null}</td>
                      <td className="px-4 py-3">
                        {x.document?.isPublic || (staff && x.document) ? (
                          <a href={`/documents/${x.document!.id}`} className="underline" target="_blank" rel="noopener">View PDF</a>
                        ) : x.document ? (
                          <span className="text-slate">Private — shared on request</span>
                        ) : (
                          <span className="text-slate">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 border border-dashed border-line bg-white p-5 text-sm text-slate">No documents have been registered for this property yet. Ask us which records are available.</p>
          )}
        </section>

        {/* D — Site & surroundings */}
        <section className="lg:col-span-7" aria-labelledby="site-h">
          <h2 id="site-h" className="annot text-emerald">D · Site & surroundings</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border border-line bg-white p-4">
              <p className="annot-plain text-slate">Access road</p>
              <p className="mt-1 text-ink">{p.accessRoad ?? <span className="text-slate">Not recorded</span>}</p>
            </div>
            <div className="border border-line bg-white p-4">
              <p className="annot-plain text-slate">Utilities</p>
              <p className="mt-1 whitespace-pre-line text-ink">{p.utilities ?? <span className="text-slate">Not recorded</span>}</p>
            </div>
          </div>
          {p.amenities.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.amenities.map((a) => <li key={a.id} className="border border-emerald/30 bg-white px-3 py-1.5 text-sm text-emerald">✓ {a.name}</li>)}
            </ul>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {groups.map(({ st, items }) => (
              <div key={st} className="border border-line bg-white p-4">
                <p className={`annot-plain ${st === "EXISTING" ? "text-emerald" : st === "PROPOSED" ? "text-gold-deep" : "text-slate"}`}>
                  {st === "EXISTING" ? "Existing" : st === "PROPOSED" ? "Officially proposed" : "Unconfirmed"}
                </p>
                {items.length ? (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {items.map((f) => (
                      <li key={f.name}>
                        {f.name}{f.distanceKm !== null ? <span className="text-slate"> · {f.distanceKm} km</span> : null}
                        {f.source && <span className="block text-xs text-slate">Source: {f.source}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate">None recorded.</p>}
              </div>
            ))}
          </div>
          {unknownKinds.length > 0 && <p className="mt-3 text-xs text-slate">Not yet known: {unknownKinds.map(([, l]) => l.toLowerCase()).join(", ")}.</p>}
          {sitePhotos.length > 0 && (
            <div className="mt-6">
              <Gallery title={p.title} images={sitePhotos.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind }))} />
            </div>
          )}
        </section>

        {/* E — Development potential */}
        <section className="lg:col-span-5" aria-labelledby="dev-h">
          <h2 id="dev-h" className="annot text-emerald">E · Development potential</h2>
          <div className="mt-4 border border-navy bg-navy p-6 text-ivory">
            {teaser && open ? (
              <>
                <p className="font-serif text-2xl">A {DEFAULT_INPUTS.floors}-storey, {DEFAULT_INPUTS.bedrooms}-bedroom concept of about {teaser.achievedBuiltUpSqft.toLocaleString("en-IN")} sq ft {teaser.feasible ? "fits" : "doesn't fit cleanly"} on this plot.</p>
                <p className="mt-2 text-sm text-ivory/75">Starting point only{plot?.setbackSource === "ASSUMED" ? ", using assumed setbacks" : ""}. Change every choice in Property Studio — the plot's recorded data loads automatically.</p>
                <Link href={`/studio/${p.slug}`} className="btn btn-gold mt-5">Design Your Home</Link>
              </>
            ) : home ? (
              <p className="text-ivory/85">This is a completed home. Ask us about extension or renovation possibilities.</p>
            ) : (
              <p className="text-ivory/85">Plot dimensions aren't on record yet, so a house concept can't be generated from this record. <Link href="/studio" className="underline">Try an illustrative plot</Link> or ask us for the dimensions.</p>
            )}
          </div>
        </section>

        {/* F — Activity */}
        <section className="lg:col-span-12" aria-labelledby="activity-h">
          <h2 id="activity-h" className="annot text-emerald">F · Property history</h2>
          {activity.length ? (
            <ol className="mt-4 border-l-2 border-gold pl-6">
              {activity.map((a) => (
                <li key={a.id} className="relative pb-5">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ivory bg-gold" aria-hidden="true" />
                  <p className="text-ink">{a.summary}{!a.isPublic && <span className="ml-2 text-xs text-terracotta-deep">(staff only)</span>}</p>
                  <p className="annot-plain mt-0.5 text-slate">{formatDate(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate">No recorded changes yet.</p>
          )}
        </section>
      </div>
    </article>
  );
}
