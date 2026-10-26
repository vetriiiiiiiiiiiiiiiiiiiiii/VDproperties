"use client";

import { useEffect, useState } from "react";
import Link from "@/i18n/Link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, SampleTag } from "@/components/site/ui";
import { useI18n } from "@/i18n/client";

export type ShowcaseItem = {
  slug: string;
  ref: string;
  title: string;
  type: string;
  place: string | null;
  facts: string[];
  price: string;
  availability: "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE";
  sample: boolean;
  image: { url: string; alt: string } | null;
};

const INTERVAL = 6500;

/**
 * The hero's right-hand panel: real featured listings, one at a time, with a slow push-in on the
 * photo and a caption bar that links to the listing. Several listings crossfade on a timer that
 * pauses on hover, focus, reduced motion, or when the visitor presses pause.
 */
export function FeaturedShowcase({ items }: { items: ShowcaseItem[] }) {
  const { t } = useI18n();
  const h = t.home.hero;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);
  useEffect(() => {
    if (n < 2 || paused || hold) return;
    const id = window.setTimeout(() => setI((x) => (x + 1) % n), INTERVAL);
    return () => window.clearTimeout(id);
  }, [i, n, paused, hold]);

  if (!n)
    return (
      <div className="relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-[1.25rem] bg-paper p-8">
        <Media src="placeholder:villa" alt="" sizes="(min-width:1024px) 55vw, 100vw" tone="navy" />
        <div className="relative max-w-sm rounded-xl bg-white/95 p-5">
          <p className="font-serif text-2xl text-navy">{h.empty}</p>
          <p className="mt-2 text-sm text-slate">{h.emptyBody}</p>
        </div>
      </div>
    );

  const go = (d: number) => setI((x) => (x + d + n) % n);

  return (
    <figure
      className="showcase group relative h-full min-h-[24rem] overflow-hidden rounded-[1.25rem] bg-navy-deep"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      aria-roledescription="carousel"
      aria-label={h.featured}
    >
      {items.map((it, k) => (
        <div key={it.slug} className="absolute inset-0 transition-opacity duration-[1200ms] ease-out" style={{ opacity: k === i ? 1 : 0 }} aria-hidden={k !== i}>
          <div className={`absolute inset-0 ${k === i ? "showcase-push" : ""}`}>
            <Media src={it.image?.url} alt={it.image?.alt ?? it.title} sizes="(min-width:1024px) 58vw, 100vw" priority={k === 0} tone="navy" />
          </div>
        </div>
      ))}

      {/* Quiet top bar: label and position */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5">
        <span className="rounded-full bg-white/92 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-navy">{h.featured}</span>
        {n > 1 && <span className="rounded-full bg-navy-deep/70 px-3 py-1 font-mono text-xs text-ivory" aria-live="polite">{h.count(i + 1, n)}</span>}
      </div>

      {/* Caption bar for the current listing */}
      {items.map((it, k) =>
        k === i ? (
          <figcaption key={it.slug} className="showcase-caption absolute inset-x-3 bottom-3 rounded-[1rem] bg-white p-4 sm:inset-x-5 sm:bottom-5 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
              <AvailabilityBadge value={it.availability} />
              {it.sample && <SampleTag />}
              <span className="font-mono tracking-wide">{it.ref}</span>
              <span aria-hidden="true">·</span>
              <span>{it.type}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <p className="truncate font-serif text-2xl leading-tight text-navy sm:text-[1.7rem]">{it.title}</p>
                <p className="mt-1 text-sm text-slate">{[it.place, ...it.facts].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-serif text-2xl text-navy">{it.price}</p>
                <Link href={`/properties/${it.slug}`} className="btn btn-primary min-h-10 whitespace-nowrap py-2 text-sm">
                  {h.view}
                </Link>
              </div>
            </div>
          </figcaption>
        ) : null,
      )}

      {n > 1 && (
        <div className="absolute right-4 top-14 flex gap-1.5 sm:right-5 sm:top-16">
          <button type="button" onClick={() => go(-1)} aria-label={h.prev} className="showcase-btn"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 3L4.5 7l4 4" /></svg></button>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? h.play : h.pause} className="showcase-btn">
            {paused ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3v8l6-4z" fill="currentColor" /></svg> : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5v7M9 3.5v7" /></svg>}
          </button>
          <button type="button" onClick={() => go(1)} aria-label={h.next} className="showcase-btn"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 3l4 4-4 4" /></svg></button>
        </div>
      )}

      {n > 1 && !paused && !hold && (
        <span key={i} aria-hidden="true" className="showcase-timer absolute left-0 top-0 h-[3px] bg-gold" style={{ animationDuration: `${INTERVAL}ms` }} />
      )}
    </figure>
  );
}
