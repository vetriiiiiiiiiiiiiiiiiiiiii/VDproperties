import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/property/Gallery";
import { AvailabilityBadge, Breadcrumbs, SampleTag } from "@/components/site/ui";
import { MapView } from "@/components/twin/MapView";
import { PlotDiagram } from "@/components/twin/PlotDiagram";
import { SaveButton } from "@/components/twin/SaveButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { alternates, getI18n } from "@/i18n/server";
import { isHomeType } from "@/lib/labels";
import { completeness, parseBoundary, parseFacilities, plotFromProperty } from "@/lib/platform";
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
  const { t } = await getI18n();
  if (!p) return { title: t.twin.detail.notFound, robots: { index: false } };
  return {
    title: t.twin.detail.metaTitle(p.title),
    description: t.twin.detail.metaDesc(p.referenceCode),
    alternates: await alternates(`/twin/${p.slug}`),
    robots: p.isSample || p.availability === "SOLD" ? { index: false } : undefined,
  };
}

const STATUS_STYLE: Record<"NOT_PROVIDED" | "RECEIVED" | "UNDER_REVIEW" | "REVIEWED" | "NEEDS_FOLLOW_UP", string> = {
  NOT_PROVIDED: "bg-paper text-slate",
  RECEIVED: "bg-navy/10 text-navy",
  UNDER_REVIEW: "bg-gold/20 text-gold-deep",
  REVIEWED: "bg-emerald text-ivory",
  NEEDS_FOLLOW_UP: "bg-terracotta/15 text-terracotta-deep",
};

export default async function TwinPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const { t, f } = await getI18n();
  const d = t.twin.detail;
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
    [t.facts.propertyId, p.referenceCode],
    [d.listingStatus, t.labels.availability[p.availability]],
    [t.facts.propertyType, t.labels.propertyType[p.type]],
    [t.facts.location, place || null],
    [d.askingPrice, price !== null ? f.price(price) : t.price.onRequestShort],
    [t.facts.landArea, p.landAreaLabel ?? (p.landAreaSqft ? f.area(p.landAreaSqft) : null)],
    [t.facts.dimensions, p.plotWidthFt && p.plotDepthFt ? `${p.plotWidthFt} ft × ${p.plotDepthFt} ft` : p.plotDimensions],
    [t.facts.facing, p.facing],
    [t.facts.builtUpArea, p.builtUpAreaSqft ? f.area(p.builtUpAreaSqft) : null],
    [t.facts.bedrooms, p.bedrooms],
    [d.accessRoad, p.accessRoad],
    [t.facts.developmentStatus, p.developmentStatus],
    [d.developer, p.developer?.name],
    [t.facts.project, p.project?.publication === "PUBLISHED" ? p.project.name : null],
  ];
  const groups = (["EXISTING", "PROPOSED", "UNCONFIRMED"] as const).map((st) => ({ st, items: facilities.filter((x) => x.status === st) }));
  const unknownKinds = Object.keys(FACILITY_KINDS).filter((k) => !facilities.some((x) => x.kind === k));

  return (
    <article className="bg-ivory">
      {/* Dossier header */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="survey-grid absolute inset-0 text-navy" aria-hidden="true" />
        <div className="wrap relative py-10 lg:py-14">
          <Breadcrumbs items={[{ label: t.twin.index.eyebrow, href: "/twin" }, { label: p.referenceCode }]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="annot text-emerald">{d.eyebrow(p.referenceCode)}</p>
              <h1 className="mt-4 text-headline text-navy">{p.title}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <AvailabilityBadge value={p.availability} />
                {p.isSample && <SampleTag />}
                <span className="annot-plain text-slate">{t.labels.propertyType[p.type]}{place ? ` · ${place}` : ""}</span>
              </div>
            </div>
            <div className="lg:col-span-4 lg:text-right">
              <p className="font-serif text-4xl text-navy">{price !== null ? f.price(price) : <span className="italic text-slate">{t.price.priceOnRequest}</span>}</p>
              <p className="annot-plain mt-2 text-slate">{d.completeness(score)}</p>
              <div className="liquid-track mt-2 w-full lg:ml-auto lg:w-48" role="img" aria-label={d.completeness(score)}>
                <div className="liquid-track-fill" style={{ width: `${score}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/properties/${p.slug}`} className="btn btn-primary">{d.explore}</Link>
            {plot && open && <Link href={`/studio/${p.slug}`} className="btn btn-gold">{d.openStudio}</Link>}
            {open && <Link href={`/site-visit?for=p:${p.id}`} className="btn btn-outline text-navy">{d.requestVisit}</Link>}
            <SaveButton propertyId={p.id} saved={saved} signedIn={user?.role === "CUSTOMER"} />
          </div>
          {!open && <p className="surface mt-6 border-l-4 border-terracotta p-3 text-sm">{d.keptForReference(t.labels.availability[p.availability].toLocaleLowerCase())}</p>}
        </div>
      </header>

      <div className="wrap grid gap-10 py-12 lg:grid-cols-12">
        {/* A — Map & boundary */}
        <section className="lg:col-span-7" aria-labelledby="map-h">
          <h2 id="map-h" className="annot text-emerald">{d.a}</h2>
          <div className="mt-4">
            {exact ? (
              <>
                <MapView
                  label={d.mapOf(p.title)}
                  pins={[{ lat: p.latitude!, lng: p.longitude!, label: p.title, status: p.availability }]}
                  boundary={boundary.length >= 3 ? boundary : undefined}
                  boundaryStyle={p.boundaryStatus === "SURVEYED" ? "solid" : "dashed"}
                />
                <p className="mt-2 text-sm text-slate">
                  {boundary.length >= 3
                    ? p.boundaryStatus === "SURVEYED"
                      ? d.surveyed(p.boundarySource)
                      : d.approximate
                    : d.pinOnly}
                </p>
              </>
            ) : (
              <div className="rounded-[1rem] border border-dashed border-line bg-white/70 p-6">
                <p className="text-ink">{place || d.shared}</p>
                <p className="mt-1 text-sm text-slate">{d.notAuthorised}</p>
              </div>
            )}
          </div>
          {p.plotWidthFt && p.plotDepthFt && (
            <figure className="surface mt-8 flex flex-col items-center p-6">
              <PlotDiagram widthFt={p.plotWidthFt} depthFt={p.plotDepthFt} frontBearing={p.frontBearing} road={p.accessRoad} />
              <figcaption className="mt-3 text-center text-xs text-slate">
                {d.drawnToScale}{p.frontBearing === null ? d.noOrientation : ""}.
              </figcaption>
            </figure>
          )}
        </section>

        {/* B — Facts */}
        <section className="lg:col-span-5" aria-labelledby="facts-h">
          <h2 id="facts-h" className="annot text-emerald">{d.b}</h2>
          <dl className="surface mt-4 divide-y divide-line px-5 py-1">
            {facts.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5 text-sm">
                <dt className="text-slate">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {p.siteConstraints && (
            <div className="surface mt-6 border-l-4 border-gold p-4 text-sm">
              <p className="annot-plain text-gold-deep">{d.constraints}</p>
              <p className="mt-1 whitespace-pre-line text-ink">{p.siteConstraints}</p>
            </div>
          )}
        </section>

        {/* C — Passport */}
        <section className="lg:col-span-12" aria-labelledby="passport-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="passport-h" className="annot text-emerald">{d.c}</h2>
            <p className="max-w-xl text-xs text-slate">{d.passportNote}</p>
          </div>
          {passport.length ? (
            <div className="surface mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
                  <tr>{(["document", "status", "reviewed", "notes", "access"] as const).map((c) => <th key={c} scope="col" className="px-4 py-3">{d.cols[c]}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {passport.map((x) => (
                    <tr key={x.id}>
                      <td className="px-4 py-3 font-medium">{x.documentType}</td>
                      <td className="px-4 py-3"><span className={`annot-plain inline-block rounded-full px-2.5 py-1 text-[0.6rem] ${STATUS_STYLE[x.status]}`}>{d.passportStatus[x.status]}</span></td>
                      <td className="px-4 py-3 text-slate">{x.reviewedAt ? f.date(x.reviewedAt) : "—"}</td>
                      <td className="px-4 py-3 text-slate">{x.publicNote ?? "—"}{staff && x.privateNote ? <span className="block text-xs text-terracotta-deep">{d.staffNote(x.privateNote)}</span> : null}</td>
                      <td className="px-4 py-3">
                        {x.document?.isPublic || (staff && x.document) ? (
                          <a href={`/documents/${x.document!.id}`} className="underline" target="_blank" rel="noopener">{d.viewPdf}</a>
                        ) : x.document ? (
                          <span className="text-slate">{d.private}</span>
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
            <p className="mt-4 rounded-[1rem] border border-dashed border-line bg-white/70 p-5 text-sm text-slate">{d.noPassport}</p>
          )}
        </section>

        {/* D — Site & surroundings */}
        <section className="lg:col-span-7" aria-labelledby="site-h">
          <h2 id="site-h" className="annot text-emerald">{d.d}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="surface p-4">
              <p className="annot-plain text-slate">{d.accessRoad}</p>
              <p className="mt-1 text-ink">{p.accessRoad ?? <span className="text-slate">{d.notRecorded}</span>}</p>
            </div>
            <div className="surface p-4">
              <p className="annot-plain text-slate">{d.utilities}</p>
              <p className="mt-1 whitespace-pre-line text-ink">{p.utilities ?? <span className="text-slate">{d.notRecorded}</span>}</p>
            </div>
          </div>
          {p.amenities.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.amenities.map((a) => <li key={a.id} className="rounded-full border border-emerald/30 bg-white px-3 py-1.5 text-sm text-emerald">✓ {a.name}</li>)}
            </ul>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {groups.map(({ st, items }) => (
              <div key={st} className="surface p-4">
                <p className={`annot-plain ${st === "EXISTING" ? "text-emerald" : st === "PROPOSED" ? "text-gold-deep" : "text-slate"}`}>
                  {st === "EXISTING" ? d.existing : st === "PROPOSED" ? d.proposed : d.unconfirmed}
                </p>
                {items.length ? (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {items.map((x) => (
                      <li key={x.name}>
                        {x.name}{x.distanceKm !== null ? <span className="text-slate"> · {x.distanceKm} km</span> : null}
                        {x.source && <span className="block text-xs text-slate">{d.source(x.source)}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate">{d.noneRecorded}</p>}
              </div>
            ))}
          </div>
          {unknownKinds.length > 0 && <p className="mt-3 text-xs text-slate">{d.notKnown(unknownKinds.map((k) => t.twin.facilities[k].toLocaleLowerCase()).join(", "))}</p>}
          {sitePhotos.length > 0 && (
            <div className="mt-6">
              <Gallery title={p.title} images={sitePhotos.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind }))} />
            </div>
          )}
        </section>

        {/* E — Development potential */}
        <section className="lg:col-span-5" aria-labelledby="dev-h">
          <h2 id="dev-h" className="annot text-emerald">{d.e}</h2>
          <div className="relative mt-4 overflow-hidden rounded-[1rem] bg-navy p-6 text-ivory">
            <div className="relative">
            {teaser && open ? (
              <>
                <p className="font-serif text-2xl">{d.teaser(DEFAULT_INPUTS.floors, DEFAULT_INPUTS.bedrooms, f.area(teaser.achievedBuiltUpSqft), teaser.feasible)}</p>
                <p className="mt-2 text-sm text-ivory/75">{d.teaserNote(plot?.setbackSource === "ASSUMED")}</p>
                <Link href={`/studio/${p.slug}`} className="btn btn-gold mt-5">{d.designHome}</Link>
              </>
            ) : home ? (
              <p className="text-ivory/85">{d.completedHome}</p>
            ) : (
              <p className="text-ivory/85">{d.noDims} <Link href="/studio" className="underline">{d.tryIllustrative}</Link> {d.askDims}</p>
            )}
            </div>
          </div>
        </section>

        {/* F — Activity */}
        <section className="lg:col-span-12" aria-labelledby="activity-h">
          <h2 id="activity-h" className="annot text-emerald">{d.f}</h2>
          {activity.length ? (
            <ol className="mt-4 border-l-2 border-gold pl-6">
              {activity.map((a) => (
                <li key={a.id} className="relative pb-5">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ivory bg-gold" aria-hidden="true" />
                  <p className="text-ink">{a.summary}{!a.isPublic && <span className="ml-2 text-xs text-terracotta-deep">{d.staffOnly}</span>}</p>
                  <p className="annot-plain mt-0.5 text-slate">{f.date(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate">{d.noHistory}</p>
          )}
        </section>
      </div>
    </article>
  );
}
