import Link from "next/link";

export type SkylineBar = { label: string; count: number; href: string };

/**
 * The logo's gold skyline, used as a real chart: each building's height is the number of
 * open listings in that location. Grows as it scrolls into view.
 */
export function InventorySkyline({ bars }: { bars: SkylineBar[] }) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  return (
    <figure className="vd-skyline">
      <ul className="flex h-64 items-end justify-center gap-4 border-b-2 border-gold-deep sm:gap-8" aria-label="Open listings by location">
        {bars.map((b, i) => {
          const h = 18 + (b.count / max) * 82;
          return (
            <li key={b.label} className="flex h-full min-w-0 max-w-[5.5rem] flex-1 flex-col justify-end">
              <Link href={b.href} className="group flex h-full flex-col justify-end focus-visible:outline-offset-4" aria-label={`${b.label}: ${b.count} open listing${b.count === 1 ? "" : "s"}`}>
                <span className="mb-2 text-center font-serif text-2xl text-navy transition-transform group-hover:-translate-y-1">{b.count}</span>
                <span
                  className="vd-skybar relative block w-full overflow-hidden transition-[filter] group-hover:brightness-110"
                  style={{ height: `${h}%`, background: "linear-gradient(120deg,#F3C86A,#D4921C 55%,#8A560A)", animationDelay: `${i * 60}ms` }}
                >
                  <span className="absolute inset-y-0 right-0 w-[22%] bg-black/20" />
                  {/* Window rhythm */}
                  <span className="absolute inset-x-[18%] top-3 bottom-3 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.35)_0_2px,transparent_2px_14px)] opacity-60" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-3 flex justify-center gap-4 sm:gap-8">
        {bars.map((b) => (
          <span key={b.label} className="annot-plain min-w-0 max-w-[5.5rem] flex-1 truncate text-center text-[0.6rem] text-slate" title={b.label}>{b.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}
