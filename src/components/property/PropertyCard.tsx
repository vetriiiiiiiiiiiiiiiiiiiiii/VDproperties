import Link from "next/link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, SampleTag } from "@/components/site/ui";
import { formatArea, formatPrice } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, isHomeType } from "@/lib/labels";
import type { PropertyCard as Card } from "@/lib/queries";

export function PriceLabel({ price, className = "" }: { price: number | null; className?: string }) {
  return price === null ? (
    <span className={`font-serif italic text-slate ${className}`}>Contact for price</span>
  ) : (
    <span className={`font-serif text-navy ${className}`}>{formatPrice(price)}</span>
  );
}

/** Land and homes surface different facts, so each gets its own spec line. */
export function cardFacts(p: Card): [string, string][] {
  const facts: [string, string][] = [];
  if (isHomeType(p.type)) {
    if (p.bedrooms) facts.push(["Bedrooms", String(p.bedrooms)]);
    if (p.builtUpAreaSqft) facts.push(["Built-up", formatArea(p.builtUpAreaSqft)]);
    if (p.landAreaSqft) facts.push(["Plot", formatArea(p.landAreaSqft)]);
  } else {
    if (p.landAreaSqft) facts.push(["Area", p.landAreaLabel ?? formatArea(p.landAreaSqft)]);
    if (p.plotDimensions) facts.push(["Dimensions", p.plotDimensions]);
  }
  return facts.slice(0, 3);
}

export function PropertyCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const place = p.localityLabel ?? p.location?.name;
  const home = isHomeType(p.type);
  return (
    <article className="group relative flex h-full flex-col border border-line bg-white">
      <div className={`relative overflow-hidden ${home ? "aspect-[4/3]" : "aspect-[16/10]"}`}>
        <Media src={p.image?.url} alt={p.image?.alt ?? p.title} sizes="(min-width:1024px) 30vw, (min-width:640px) 50vw, 100vw" priority={priority} className="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <AvailabilityBadge value={p.availability} />
          {p.isSample && <SampleTag />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="annot-plain flex flex-wrap gap-x-3 text-slate">
          <span className="text-emerald">{PROPERTY_TYPE_LABEL[p.type]}</span>
          <span>{p.referenceCode}</span>
        </p>
        <h3 className="mt-3 text-[1.45rem] leading-snug text-ink">
          <Link href={`/properties/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {p.title}
          </Link>
        </h3>
        {place && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate">
            <svg width="10" height="13" viewBox="0 0 10 13" aria-hidden="true"><path d="M5 12.5S.5 7.6.5 4.9a4.5 4.5 0 0 1 9 0C9.5 7.6 5 12.5 5 12.5z" fill="none" stroke="currentColor" /></svg>
            {place}
          </p>
        )}
        {cardFacts(p).length > 0 && (
          <dl className="mt-5 grid grid-cols-3 border-t border-line pt-4">
            {cardFacts(p).map(([k, v]) => (
              <div key={k} className="pr-2">
                <dt className="annot-plain text-[0.6rem] text-slate">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <PriceLabel price={p.price} className="text-2xl" />
          <span aria-hidden="true" className="text-sm font-semibold text-emerald transition-transform group-hover:translate-x-1">View →</span>
        </div>
      </div>
      <span className="pointer-events-none absolute inset-0 ring-emerald transition group-focus-within:ring-2" aria-hidden="true" />
    </article>
  );
}
