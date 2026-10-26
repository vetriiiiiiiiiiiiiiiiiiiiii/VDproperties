import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";
import { AvailabilityBadge, Breadcrumbs, JsonLd, ProjectStatusBadge, SampleTag } from "@/components/site/ui";
import { phoneHref, whatsappHref } from "@/lib/format";
import { isHomeType } from "@/lib/labels";
import { getRelatedProperties, type PropertyDetail } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site";
import { VISIT_WINDOW_DAYS } from "@/lib/validation";
import { SaveButton } from "@/components/twin/SaveButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EnquiryPanel } from "./EnquiryPanel";
import { Gallery } from "./Gallery";
import { PropertyCard } from "./PropertyCard";

type Spec = [label: string, value: string | number | null | undefined];

export async function PropertyDetailView({ p, preview = false }: { p: PropertyDetail; preview?: boolean }) {
  const { t, f, href } = await getI18n();
  const d = t.listings.detail;
  const area = (n: number) => f.area(n);
  const [settings, related] = await Promise.all([
    getSettings(),
    preview ? Promise.resolve([]) : getRelatedProperties({ id: p.id, type: p.type, locationId: p.locationId, publicPrice: p.publicPrice }),
  ]);
  const viewer = preview ? null : await getCurrentUser();
  const buyerAccount = viewer?.role === "CUSTOMER" ? await db.user.findUnique({ where: { id: viewer.id }, select: { name: true, phone: true } }) : null;
  const isSaved = viewer?.role === "CUSTOMER" ? !!(await db.savedProperty.findUnique({ where: { userId_propertyId: { userId: viewer.id, propertyId: p.id } } })) : false;
  const home = isHomeType(p.type);
  const price = p.publicPrice === null ? null : Number(p.publicPrice);
  const place = p.localityLabel ?? p.location?.name;
  const open = p.availability === "AVAILABLE" || p.availability === "RESERVED";
  const listHref = home ? "/houses" : "/plots";

  // Only fields that hold a value are shown; empty labels are never rendered.
  const keyFacts: Spec[] = home
    ? [
        [t.facts.bedrooms, p.bedrooms],
        [t.facts.bathrooms, p.bathrooms],
        [t.facts.builtUpArea, p.builtUpAreaSqft ? area(p.builtUpAreaSqft) : null],
        [t.facts.plotArea, p.landAreaLabel ?? (p.landAreaSqft ? area(p.landAreaSqft) : null)],
      ]
    : [
        [t.facts.landArea, p.landAreaLabel ?? (p.landAreaSqft ? area(p.landAreaSqft) : null)],
        [t.facts.dimensions, p.plotDimensions],
        [t.facts.facing, p.facing],
        [t.facts.accessRoad, p.accessRoad],
      ];
  const details: Spec[] = [
    [t.facts.propertyId, p.referenceCode],
    [t.facts.propertyType, t.labels.propertyType[p.type]],
    [t.facts.location, [place, p.location?.city].filter(Boolean).join(", ") || null],
    [t.facts.landArea, p.landAreaLabel ?? (p.landAreaSqft ? area(p.landAreaSqft) : null)],
    [t.facts.plotDimensions, p.plotDimensions],
    [t.facts.facing, p.facing],
    [t.facts.builtUpArea, p.builtUpAreaSqft ? area(p.builtUpAreaSqft) : null],
    [t.facts.bedrooms, p.bedrooms],
    [t.facts.bathrooms, p.bathrooms],
    [t.facts.floors, p.floors],
    [t.facts.accessRoad, p.accessRoad],
    [t.facts.developmentStatus, p.developmentStatus],
    [t.facts.project, p.project?.publication === "PUBLISHED" ? p.project.name : null],
  ];
  const visible = (s: Spec[]) => s.filter(([, v]) => v !== null && v !== undefined && v !== "");

  const exactMap = p.showExactLocation && p.latitude !== null && p.longitude !== null;
  const call = settings.phone ? `tel:${phoneHref(settings.phone)}` : undefined;
  const wa = settings.whatsapp ? whatsappHref(settings.whatsapp, t.listings.panel.whatsappText(p.referenceCode, p.title)) : undefined;

  return (
    <article>
      {!preview && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: p.title,
            url: absoluteUrl(href(`/properties/${p.slug}`)),
            ...(p.summary && { description: p.summary }),
            ...(p.publishedAt && { datePosted: p.publishedAt.toISOString() }),
            ...(p.images[0] && !p.images[0].url.startsWith("placeholder:") && { image: absoluteUrl(p.images[0].url) }),
            ...(price !== null && {
              offers: {
                "@type": "Offer",
                price,
                priceCurrency: "INR",
                availability: p.availability === "AVAILABLE" ? "https://schema.org/InStock" : p.availability === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/LimitedAvailability",
              },
            }),
          }}
        />
      )}

      <div className="wrap pb-6 pt-8">
        {!preview && <Breadcrumbs items={[{ label: home ? t.listings.pages.houses.crumb : t.listings.pages.plots.crumb, href: listHref }, { label: p.title }]} />}
      </div>

      {!open && (
        <div className="wrap">
          <p className="surface border-l-4 border-terracotta p-4 text-sm text-ink">
            {d.unavailable(d.soldNotice(p.availability === "SOLD"))}{" "}
            <Link href={listHref} className="underline">{d.seeAvailable(home)}</Link>.
          </p>
        </div>
      )}

      <div className="wrap mt-6">
        <Gallery title={p.title} images={p.images.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind }))} />
      </div>

      <div className="wrap grid gap-12 py-12 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <AvailabilityBadge value={p.availability} />
            {p.project?.publication === "PUBLISHED" && <ProjectStatusBadge value={p.project.status} />}
            {p.isSample && <SampleTag />}
            <span className="annot-plain ml-1 text-slate">{p.referenceCode}</span>
          </div>
          <p className="annot mt-6 text-emerald">{t.labels.propertyType[p.type]}{place ? ` · ${place}` : ""}</p>
          <h1 className="mt-3 text-headline text-navy">{p.title}</h1>
          <p className="mt-5">
            {price !== null ? (
              <span className="font-serif text-4xl text-navy">{f.price(price)}</span>
            ) : (
              <span className="font-serif text-3xl italic text-slate">{t.price.onRequest}</span>
            )}
            {p.priceNote && <span className="ml-3 text-sm text-slate">{p.priceNote}</span>}
          </p>
          {!preview && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/twin/${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy">{d.openTwin}</Link>
              {p.plotWidthFt && p.plotDepthFt && open && <Link href={`/studio/${p.slug}`} className="btn btn-gold min-h-10 text-sm">{d.design}</Link>}
              <Link href={`/compare?p=${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy">{d.compare}</Link>
              <SaveButton propertyId={p.id} saved={isSaved} signedIn={viewer?.role === "CUSTOMER"} className="min-h-10 text-sm" />
            </div>
          )}

          {visible(keyFacts).length > 0 && (
            <dl className="mt-10 grid grid-cols-2 gap-3 text-navy sm:grid-cols-4">
              {visible(keyFacts).map(([k, v], i) => (
                <div key={k} className="surface vd-pop p-4" style={{ ["--i" as string]: i }}>
                  <dt className="annot-plain text-slate">{k}</dt>
                  <dd className="mt-2 font-serif text-xl">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {p.source === "OWNER" && (
            <p className="mt-8 flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-slate">
              <span className="shrink-0 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold-deep">{t.market.ownerTag}</span>
              <span>{t.market.ownerNote}</span>
            </p>
          )}
          {p.summary && <p className="mt-10 font-serif text-2xl leading-snug text-ink">{p.summary}</p>}
          {p.description && (
            <div className="prose-vd mt-6">
              {p.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          <section className="mt-12" aria-labelledby="details-h">
            <h2 id="details-h" className="annot text-emerald">{d.details}</h2>
            <dl className="surface mt-4 divide-y divide-line px-5">
              {visible(details).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 py-3">
                  <dt className="text-sm text-slate">{k}</dt>
                  <dd className="text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {p.amenities.length > 0 && (
            <section className="mt-12" aria-labelledby="amen-h">
              <h2 id="amen-h" className="annot text-emerald">{d.amenities}</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-ink">
                    <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                    {a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {[
            [d.utilities, p.utilities],
            [d.specs, p.constructionSpecs],
            [d.approvals, p.approvalInfo],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <section key={k} className="mt-12">
                <h2 className="annot text-emerald">{k}</h2>
                <div className="prose-vd mt-4 whitespace-pre-line">{v}</div>
              </section>
            ))}

          {p.documents.length > 0 && (
            <section className="mt-12">
              <h2 className="annot text-emerald">{d.documents}</h2>
              <ul className="mt-4 space-y-2">
                {p.documents.map((doc) => (
                  <li key={doc.id}>
                    <a href={`/documents/${doc.id}`} className="link-arrow text-navy" target="_blank" rel="noopener">{doc.title} {d.pdf}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12" aria-labelledby="loc-h">
            <h2 id="loc-h" className="annot text-emerald">{d.location}</h2>
            {exactMap ? (
              <div className="mt-4">
                <div className="relative aspect-[16/9] overflow-hidden rounded-[1rem]">
                  <iframe
                    title={d.mapTitle(p.title)}
                    className="absolute inset-0 h-full w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.longitude! - 0.01},${p.latitude! - 0.006},${p.longitude! + 0.01},${p.latitude! + 0.006}&layer=mapnik&marker=${p.latitude},${p.longitude}`}
                  />
                </div>
                <a href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm text-navy">{d.largerMap}</a>
              </div>
            ) : (
              <div className="mt-4 rounded-[1rem] border border-dashed border-line bg-white/70 p-5">
                <p className="text-ink">{[place, p.location?.city, p.location?.state].filter(Boolean).join(", ") || d.sharedOnEnquiry}</p>
                <p className="mt-1 text-sm text-slate">{d.exactShared}</p>
                {p.mapUrl && /^https:\/\//.test(p.mapUrl) && (
                  <a href={p.mapUrl} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm text-navy">{d.viewArea}</a>
                )}
              </div>
            )}
          </section>

          <p className="annot-plain mt-10 text-slate">
            {d.updated(f.date(p.updatedAt))}
          </p>
        </div>

        <aside className="lg:col-span-5 lg:col-start-8">
          <div className="lg:sticky lg:top-28">
            {preview ? (
              <div className="rounded-[1rem] border border-dashed border-line bg-white p-6 text-sm text-slate">{d.previewForms}</div>
            ) : open ? (
              <EnquiryPanel
                subject={{ propertyId: p.id }}
                label={`${p.referenceCode} · ${p.title}`}
                canVisit
                visit={{ closedWeekdays: settings.visitClosedWeekdays, blackoutDates: settings.visitBlackoutDates, maxDays: VISIT_WINDOW_DAYS }}
                businessName={settings.businessName}
                buyer={{ signedIn: !!buyerAccount, own: !!viewer && p.sellerId === viewer.id, name: buyerAccount?.name ?? "", phone: buyerAccount?.phone ?? "" }}
                next={href(`/properties/${p.slug}#enquire`)}
                phoneHref={call}
                phone={settings.phone ?? undefined}
                whatsappHref={wa}
              />
            ) : (
              <div className="surface p-6">
                <p className="font-serif text-2xl text-navy">{d.similarTitle}</p>
                <p className="mt-2 text-slate">{d.similarBody}</p>
                <Link href="/contact#enquire" className="btn btn-primary mt-5 w-full">{t.enquireNow}</Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-paper py-16 lg:py-20" aria-labelledby="related-h">
          <div className="wrap">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-h" className="text-headline text-navy">{d.related}</h2>
              <Link href={listHref} className="link-arrow hidden text-emerald sm:inline-flex">{d.seeAll}</Link>
            </div>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <PropertyCard p={r} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
