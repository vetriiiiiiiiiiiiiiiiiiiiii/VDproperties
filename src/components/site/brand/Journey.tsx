import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";

const STATIONS = [
  { n: "01", name: "PlotFit", href: "/plotfit" },
  { n: "02", name: "Property Twin", href: "/twin" },
  { n: "03", name: "Property Studio", href: "/studio" },
  { n: "04", name: "BuildTrace", href: "/buildtrace" },
];

/**
 * The connected property-to-home journey. A single drop of liquid travels the route and
 * merges into each station as it passes (gooey filter), instead of a static line.
 */
export async function Journey() {
  const { t } = await getI18n();
  const j = t.home.journey;
  return (
    <section className="survey-grid relative mx-2 overflow-hidden rounded-[1.5rem] bg-navy py-20 text-ivory sm:mx-4 lg:py-28" aria-labelledby="journey-h">
      <div className="wrap relative">
        <div className="grid gap-6 lg:grid-cols-12" data-reveal>
          <p className="annot text-gold-light lg:col-span-3 lg:pt-4">{j.eyebrow}</p>
          <h2 id="journey-h" className="text-headline lg:col-span-8">{j.title}</h2>
        </div>
        <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          {/* The route and its travelling drop live in one gooey layer so the drop melts into each station. */}
          <div aria-hidden="true" className="journey-route absolute left-6 right-6 top-0 hidden h-12 md:block">
            <span className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gold-light/40" />
            {STATIONS.map((s, i) => (
              <span key={s.n} className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-light" style={{ left: `${(i / (STATIONS.length - 1)) * 100}%` }} />
            ))}
            <span className="journey-drop absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-light" />
          </div>
          {STATIONS.map((s, i) => (
            <li key={s.n} className="relative" data-reveal style={{ animationDelay: `${i * 80}ms` }}>
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gold-light font-mono text-sm text-navy md:bg-transparent">{s.n}</span>
              <p className="annot-plain mt-5 text-gold-light">{j.steps[i].verb}</p>
              <h3 className="mt-2 text-3xl">{s.name}</h3>
              <p className="mt-2 text-ivory/80">{j.steps[i].body}</p>
              <Link href={s.href} className="link-arrow mt-4 text-gold-light">{j.steps[i].cta}</Link>
            </li>
          ))}
        </ol>
        <p className="mt-14 max-w-2xl text-sm text-ivory/70">{j.footnote}</p>
      </div>
    </section>
  );
}
