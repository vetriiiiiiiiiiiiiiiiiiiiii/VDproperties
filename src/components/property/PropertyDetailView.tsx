import Link from "next/link";
import { AvailabilityBadge, Breadcrumbs, JsonLd, ProjectStatusBadge, SampleTag } from "@/components/site/ui";
import { formatArea, formatDate, formatPrice, phoneHref, whatsappHref } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, isHomeType } from "@/lib/labels";
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
  const [settings, related] = await Promise.all([
    getSettings(),
    preview ? Promise.resolve([]) : getRelatedProperties({ id: p.id, type: p.type, locationId: p.locationId, publicPrice: p.publicPrice }),
  ]);
  const viewer = preview ? null : await getCurrentUser();
  const isSaved = viewer?.role === "CUSTOMER" ? !!(await db.savedProperty.findUnique({ where: { userId_propertyId: { userId: viewer.id, propertyId: p.id } } })) : false;
  const home = isHomeType(p.type);
  const price = p.publicPrice === null ? null : Number(p.publicPrice);
  const place = p.localityLabel ?? p.location?.name;
  const open = p.availability === "AVAILABLE" || p.availability === "RESERVED";
  const listHref = home ? "/houses" : "/plots";

  // Only fields that hold a value are shown; empty labels are never rendered.
  const keyFacts: Spec[] = home
    ? [
        ["Bedrooms", p.bedrooms],
        ["Bathrooms", p.bathrooms],
        ["Built-up area", p.builtUpAreaSqft ? formatArea(p.builtUpAreaSqft) : null],
        ["Plot area", p.landAreaLabel ?? (p.landAreaSqft ? formatArea(p.landAreaSqft) : null)],
      ]
    : [
        ["Land area", p.landAreaLabel ?? (p.landAreaSqft ? formatArea(p.landAreaSqft) : null)],
        ["Dimensions", p.plotDimensions],
        ["Facing", p.facing],
        ["Access road", p.accessRoad],
      ];
  const details: Spec[] = [
    ["Property ID", p.referenceCode],
    ["Property type", PROPERTY_TYPE_LABEL[p.type]],
    ["Location", [place, p.location?.city].filter(Boolean).join(", ") || null],
    ["Land area", p.landAreaLabel ?? (p.landAreaSqft ? formatArea(p.landAreaSqft) : null)],
    ["Plot dimensions", p.plotDimensions],
    ["Facing", p.facing],
    ["Built-up area", p.builtUpAreaSqft ? formatArea(p.builtUpAreaSqft) : null],
    ["Bedrooms", p.bedrooms],
    ["Bathrooms", p.bathrooms],
    ["Floors", p.floors],
    ["Access road", p.accessRoad],
    ["Development status", p.developmentStatus],
    ["Project", p.project?.publication === "PUBLISHED" ? p.project.name : null],
  ];
  const visible = (s: Spec[]) => s.filter(([, v]) => v !== null && v !== undefined && v !== "");

  const exactMap = p.showExactLocation && p.latitude !== null && p.longitude !== null;
  const call = settings.phone ? `tel:${phoneHref(settings.phone)}` : undefined;
  const wa = settings.whatsapp ? whatsappHref(settings.whatsapp, `Hello, I'm interested in ${p.referenceCode} — ${p.title}`) : undefined;

  return (
    <article>
      {!preview && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: p.title,
            url: absoluteUrl(`/properties/${p.slug}`),
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
        {!preview && <Breadcrumbs items={[{ label: home ? "Houses & villas" : "Plots & land", href: listHref }, { label: p.title }]} />}
      </div>

      {!open && (
        <div className="wrap">
          <p className="border-l-4 border-terracotta bg-white p-4 text-sm text-ink">
            This property is <strong>{p.availability === "SOLD" ? "sold" : "no longer available"}</strong>. It's shown for reference.{" "}
            <Link href={listHref} className="underline">See available {home ? "homes" : "plots"}</Link>.
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
          <p className="annot mt-6 text-emerald">{PROPERTY_TYPE_LABEL[p.type]}{place ? ` · ${place}` : ""}</p>
          <h1 className="mt-3 text-headline text-navy">{p.title}</h1>
          <p className="mt-5">
            {price !== null ? (
              <span className="font-serif text-4xl text-navy">{formatPrice(price)}</span>
            ) : (
              <span className="font-serif text-3xl italic text-slate">Contact for price</span>
            )}
            {p.priceNote && <span className="ml-3 text-sm text-slate">{p.priceNote}</span>}
          </p>
          {!preview && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/twin/${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy">Open Property Twin</Link>
              {p.plotWidthFt && p.plotDepthFt && open && <Link href={`/studio/${p.slug}`} className="btn btn-gold min-h-10 text-sm">Design Your Home</Link>}
              <Link href={`/compare?p=${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy">Compare</Link>
              <SaveButton propertyId={p.id} saved={isSaved} signedIn={viewer?.role === "CUSTOMER"} className="min-h-10 text-sm" />
            </div>
          )}

          {visible(keyFacts).length > 0 && (
            <dl className="survey-grid mt-10 grid grid-cols-2 border border-line bg-white text-navy sm:grid-cols-4">
              {visible(keyFacts).map(([k, v]) => (
                <div key={k} className="border-b border-r border-line p-4 last:border-r-0 sm:border-b-0">
                  <dt className="annot-plain text-slate">{k}</dt>
                  <dd className="mt-2 font-serif text-xl">{v}</dd>
                </div>
              ))}
            </dl>
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
            <h2 id="details-h" className="annot text-emerald">Property details</h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
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
              <h2 id="amen-h" className="annot text-emerald">Amenities & infrastructure</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-ink">
                    <span className="h-1.5 w-1.5 bg-gold" aria-hidden="true" />
                    {a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {[
            ["Utilities & infrastructure", p.utilities],
            ["Construction specifications", p.constructionSpecs],
            ["Approvals & registration", p.approvalInfo],
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
              <h2 className="annot text-emerald">Documents</h2>
              <ul className="mt-4 space-y-2">
                {p.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/documents/${d.id}`} className="link-arrow text-navy" target="_blank" rel="noopener">{d.title} (PDF)</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12" aria-labelledby="loc-h">
            <h2 id="loc-h" className="annot text-emerald">Location</h2>
            {exactMap ? (
              <div className="mt-4">
                <div className="relative aspect-[16/9] border border-line">
                  <iframe
                    title={`Map showing the location of ${p.title}`}
                    className="absolute inset-0 h-full w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.longitude! - 0.01},${p.latitude! - 0.006},${p.longitude! + 0.01},${p.latitude! + 0.006}&layer=mapnik&marker=${p.latitude},${p.longitude}`}
                  />
                </div>
                <a href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm text-navy">Open larger map</a>
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-line bg-white p-5">
                <p className="text-ink">{[place, p.location?.city, p.location?.state].filter(Boolean).join(", ") || "Location shared on enquiry"}</p>
                <p className="mt-1 text-sm text-slate">The exact location is shared with you directly when you enquire or arrange a site visit.</p>
                {p.mapUrl && /^https:\/\//.test(p.mapUrl) && (
                  <a href={p.mapUrl} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm text-navy">View the area on a map</a>
                )}
              </div>
            )}
          </section>

          <p className="annot-plain mt-10 text-slate">
            Listing updated {formatDate(p.updatedAt)}
          </p>
        </div>

        <aside className="lg:col-span-5 lg:col-start-8">
          <div className="lg:sticky lg:top-28">
            {preview ? (
              <div className="border border-dashed border-line bg-white p-6 text-sm text-slate">Enquiry forms are disabled in preview.</div>
            ) : open ? (
              <EnquiryPanel
                subject={{ propertyId: p.id }}
                label={`${p.referenceCode} · ${p.title}`}
                canVisit
                visit={{ closedWeekdays: settings.visitClosedWeekdays, blackoutDates: settings.visitBlackoutDates, maxDays: VISIT_WINDOW_DAYS }}
                businessName={settings.businessName}
                phoneHref={call}
                phone={settings.phone ?? undefined}
                whatsappHref={wa}
              />
            ) : (
              <div className="border border-line bg-white p-6">
                <p className="font-serif text-2xl text-navy">Looking for something similar?</p>
                <p className="mt-2 text-slate">Tell us what you need and we'll let you know about comparable properties.</p>
                <Link href="/contact#enquire" className="btn btn-primary mt-5 w-full">Enquire Now</Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-paper py-16 lg:py-20" aria-labelledby="related-h">
          <div className="wrap">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-h" className="text-headline text-navy">You may also consider</h2>
              <Link href={listHref} className="link-arrow hidden text-emerald sm:inline-flex">See all</Link>
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
