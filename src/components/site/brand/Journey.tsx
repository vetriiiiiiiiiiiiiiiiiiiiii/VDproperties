import Link from "next/link";

const STEPS = [
  { n: "01", name: "PlotFit", verb: "Discover", body: "Answer a few questions; get properties ranked on how well they fit — with every reason shown.", href: "/plotfit", cta: "Find My Property" },
  { n: "02", name: "Property Twin", verb: "Understand", body: "A complete record of each property: map, facts, document register, surroundings and history.", href: "/twin", cta: "Explore a Twin" },
  { n: "03", name: "Property Studio", verb: "Visualise & cost", body: "Shape a house on the plot's real dimensions and see a transparent, editable budget.", href: "/studio", cta: "Design Your Home" },
  { n: "04", name: "BuildTrace", verb: "Track the build", body: "After you sign, follow agreed milestones, approved costs, progress photos and handover.", href: "/buildtrace", cta: "Track My Build" },
];

/** The connected property-to-home journey, drawn as a surveyed route across four stations. */
export function Journey() {
  return (
    <section className="survey-grid relative overflow-hidden bg-navy py-20 text-ivory lg:py-28" aria-labelledby="journey-h">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-[-6rem] h-72 w-72 rounded-full bg-sun opacity-70" />
      <div className="wrap relative">
        <div className="grid gap-6 lg:grid-cols-12" data-reveal>
          <p className="annot text-gold-light lg:col-span-3 lg:pt-4">One connected platform</p>
          <h2 id="journey-h" className="text-headline lg:col-span-8">From the right plot to the keys in your hand.</h2>
        </div>
        <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          <svg aria-hidden="true" className="trace absolute left-0 right-0 top-6 hidden h-4 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 4">
            <path className="draw" pathLength={1} d="M2 2 H98" stroke="#F3C86A" strokeWidth="0.5" strokeDasharray="1" fill="none" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
          </svg>
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative" data-reveal style={{ animationDelay: `${i * 80}ms` }}>
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-light bg-navy font-mono text-sm text-gold-light">{s.n}</span>
              <p className="annot-plain mt-5 text-gold-light">{s.verb}</p>
              <h3 className="mt-2 text-3xl">{s.name}</h3>
              <p className="mt-2 text-ivory/80">{s.body}</p>
              <Link href={s.href} className="link-arrow mt-4 text-gold-light">{s.cta}</Link>
            </li>
          ))}
        </ol>
        <p className="mt-14 max-w-2xl text-sm text-ivory/70">Every step reads the same property records and your saved choices — nothing to re-enter, and when a property changes or sells, it changes everywhere.</p>
      </div>
    </section>
  );
}
