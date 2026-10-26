"use client";

import Link from "@/i18n/Link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, SampleTag } from "@/components/site/ui";
import { useI18n } from "@/i18n/client";
import { isHomeType } from "@/lib/labels";
import type { PropertyCard as Card } from "@/lib/queries";

export function PriceLabel({ price, className = "" }: { price: number | null; className?: string }) {
  const { t, f } = useI18n();
  return price === null ? (
    <span className={`font-serif italic text-slate ${className}`}>{t.price.onRequest}</span>
  ) : (
    <span className={`font-serif text-navy ${className}`}>{f.price(price)}</span>
  );
}

export function PropertyCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const { t, f } = useI18n();
  const place = p.localityLabel ?? p.location?.name;
  const home = isHomeType(p.type);
  // Land and homes surface different facts, so each gets its own spec line.
  const facts: [string, string][] = [];
  if (home) {
    if (p.bedrooms) facts.push([t.facts.bedrooms, String(p.bedrooms)]);
    if (p.builtUpAreaSqft) facts.push([t.facts.builtUp, f.area(p.builtUpAreaSqft)]);
    if (p.landAreaSqft) facts.push([t.facts.plot, f.area(p.landAreaSqft)]);
  } else {
    if (p.landAreaSqft) facts.push([t.facts.area, p.landAreaLabel ?? f.area(p.landAreaSqft)]);
    if (p.plotDimensions) facts.push([t.facts.dimensions, p.plotDimensions]);
  }
  return (
    <article className="surface group relative flex h-full flex-col p-2 transition-transform duration-500 [transition-timing-function:var(--ease-liquid)] hover:-translate-y-1.5">
      <div className={`blob-mask relative ${home ? "aspect-[4/3]" : "aspect-[16/10]"}`}>
        <Media src={p.image?.url} alt={p.image?.alt ?? p.title} sizes="(min-width:1024px) 30vw, (min-width:640px) 50vw, 100vw" priority={priority} className="transition-transform duration-700 group-hover:scale-[1.05]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <AvailabilityBadge value={p.availability} />
          {p.isSample && <SampleTag />}
        </div>
        <div className="glass absolute bottom-3 left-3 rounded-full px-4 py-1.5">
          <PriceLabel price={p.price} className="text-lg" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <p className="annot-plain flex flex-wrap gap-x-3 text-slate">
          <span className="text-emerald">{t.labels.propertyType[p.type]}</span>
          <span>{p.referenceCode}</span>
        </p>
        <h3 className="mt-2.5 text-[1.4rem] leading-snug text-ink">
          <Link href={`/properties/${p.slug}`} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none">
            {p.title}
          </Link>
        </h3>
        {place && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate">
            <svg width="10" height="13" viewBox="0 0 10 13" aria-hidden="true"><path d="M5 12.5S.5 7.6.5 4.9a4.5 4.5 0 0 1 9 0C9.5 7.6 5 12.5 5 12.5z" fill="none" stroke="currentColor" /></svg>
            {place}
          </p>
        )}
        {facts.length > 0 && (
          <dl className="mt-auto grid grid-cols-3 gap-2 pt-5">
            {facts.slice(0, 3).map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-paper/70 px-3 py-2">
                <dt className="annot-plain text-[0.58rem] text-slate">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-emerald transition group-focus-within:ring-2" aria-hidden="true" />
    </article>
  );
}
