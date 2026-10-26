"use client";

import Link from "@/i18n/Link";
import { useI18n } from "@/i18n/client";
import { useState } from "react";

export type ExplorerPlot = {
  slug: string;
  title: string;
  ref: string;
  area: string | null;
  dims: string | null;
  facing: string | null;
  road: string | null;
  price: string | null;
  availability: "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE";
  sample: boolean;
};

const FILL: Record<ExplorerPlot["availability"], string> = {
  AVAILABLE: "#2C7A1E",
  RESERVED: "#D4921C",
  SOLD: "#B90E10",
  UNAVAILABLE: "#565F69",
};

/**
 * An interactive site-plan drawn from real plot listings: each plot is a parcel on the layout.
 * Hover, focus or tap a parcel to read its recorded details; open it to see the listing.
 */
export function PlotExplorer({ plots }: { plots: ExplorerPlot[] }) {
  const { t } = useI18n();
  const x = t.home.explorer;
  const LABEL = t.labels.availability;
  const [active, setActive] = useState(0);
  const cols = Math.min(Math.max(Math.ceil(plots.length / 2), 2), 6);
  const W = 560;
  const cw = (W - 80) / cols;
  const p = plots[active];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
      <svg viewBox={`0 0 ${W} 420`} className="w-full" role="group" aria-label={x.aria}>
        <defs>
          <pattern id="pe-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0V8" stroke="#FDFAF3" strokeOpacity="0.5" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x="20" y="20" width={W - 40} height="380" fill="none" stroke="#F3C86A" strokeDasharray="10 6" strokeOpacity="0.7" />
        {/* central road */}
        <rect x="20" y="195" width={W - 40} height="30" fill="#FDFAF3" fillOpacity="0.08" />
        <path d={`M30 210 H${W - 30}`} stroke="#F3C86A" strokeDasharray="14 10" strokeOpacity="0.8" />
        <text x="34" y="190" fill="#FDFAF3" fillOpacity="0.6" fontSize="10" fontFamily="var(--font-plex-mono)" letterSpacing="2">{x.road}</text>
        {plots.map((plot, i) => {
          const row = i < cols ? 0 : 1;
          const col = row ? i - cols : i;
          const x = 40 + col * cw;
          const y = row ? 240 : 40;
          const on = i === active;
          return (
            <Link key={plot.slug} href={`/properties/${plot.slug}`} aria-label={`${plot.ref}: ${plot.title}, ${LABEL[plot.availability]}${plot.area ? `, ${plot.area}` : ""}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} className="outline-none">
              <g className="vd-pop cursor-pointer" style={{ ["--i" as string]: i }}>
                <rect
                  x={x + 4}
                  y={y + (on ? -6 : 0)}
                  width={cw - 8}
                  height="140"
                  rx={on ? 18 : 6}
                  fill={FILL[plot.availability]}
                  fillOpacity={on ? 0.95 : 0.55}
                  stroke={on ? "#F3C86A" : "#FDFAF3"}
                  strokeOpacity={on ? 1 : 0.5}
                  strokeWidth={on ? 3 : 1.2}
                  style={{ transition: "all .35s cubic-bezier(.2,.8,.2,1)" }}
                />
                {plot.availability === "SOLD" && <rect x={x + 4} y={y} width={cw - 8} height="140" fill="url(#pe-hatch)" pointerEvents="none" />}
                <text x={x + cw / 2} y={y + 76 + (on ? -6 : 0)} textAnchor="middle" fill="#FDFAF3" fontSize="12" fontFamily="var(--font-plex-mono)" letterSpacing="1" pointerEvents="none" style={{ transition: "all .35s" }}>
                  {plot.ref.replace(/^VDP-/, "")}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>

      <div aria-live="polite" className="glass-dark rounded-[1.25rem] p-6">
        {p && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="annot-plain rounded-full px-2.5 py-1 text-[0.6rem] text-ivory" style={{ background: FILL[p.availability] }}>{LABEL[p.availability]}</span>
              {p.sample && <span className="annot-plain rounded-full border border-dashed border-sun-light px-2.5 py-1 text-[0.6rem] text-sun-light">{t.sampleTag}</span>}
              <span className="annot-plain text-ivory/60">{p.ref}</span>
            </div>
            <p className="mt-4 font-serif text-3xl leading-tight">{p.title}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ivory/15 pt-4 text-sm">
              {([[x.area, p.area], [x.dims, p.dims], [x.facing, p.facing], [x.access, p.road]] as const)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="annot-plain text-gold-light">{k}</dt>
                    <dd className="mt-1 text-ivory/90">{v}</dd>
                  </div>
                ))}
            </dl>
            <p className="mt-5 font-serif text-2xl text-gold-light">{p.price ?? <span className="italic text-ivory/70">{t.price.onRequest}</span>}</p>
            <Link href={`/properties/${p.slug}`} className="link-arrow mt-5 text-gold-light">{x.open}</Link>
          </>
        )}
        <ul className="mt-6 flex flex-wrap gap-4 border-t border-ivory/15 pt-4 text-xs text-ivory/70" aria-label={x.legend}>
          {(["AVAILABLE", "RESERVED", "SOLD"] as const).map((a) => (
            <li key={a} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: FILL[a] }} />{LABEL[a]}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
