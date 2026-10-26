import type { Metadata } from "next";
import Link from "next/link";
import { CompareSelect } from "@/components/plotfit/CompareSelect";
import { SaveSearch } from "@/components/plotfit/SaveSearch";
import { Breadcrumbs, SampleTag } from "@/components/site/ui";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { matchInclude, toMatchProperty } from "@/lib/platform";
import { criteriaToQuery, FACILITY_KINDS, highlights, matchProperties, normaliseWeights, parseCriteria, type Match } from "@/lib/plotfit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your PlotFit matches", robots: { index: false, follow: true } };

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const criteria = parseCriteria(await searchParams);
  const [rows, settings, user, locations] = await Promise.all([
    // Unavailable listings are excluded by the matcher (with a reason) unless the visitor asks to include them.
    db.property.findMany({ where: { publication: "PUBLISHED" }, include: matchInclude }),
    getSettings(),
    getCurrentUser(),
    db.location.findMany({ select: { slug: true, name: true } }),
  ]);
  const sample = new Set(rows.filter((r) => r.isSample).map((r) => r.id));
  const result = matchProperties(rows.map(toMatchProperty), criteria, normaliseWeights(settings.plotfitWeights));
  // With only one or two matches every lens picks the same property, so highlights add nothing.
  const hl = result.matches.length >= 3 ? highlights(result.matches) : null;
  const q = criteriaToQuery(criteria);
  const consent = user?.role === "CUSTOMER" ? (await db.user.findUnique({ where: { id: user.id }, select: { marketingConsent: true } }))?.marketingConsent ?? false : false;
  const locName = (s: string) => locations.find((l) => l.slug === s)?.name ?? s;

  const summary = [
    criteria.budget && `${formatPrice(criteria.budget)} budget${criteria.reservePct ? ` (${criteria.reservePct}% kept aside)` : ""}`,
    criteria.type !== "either" && (criteria.type === "land" ? "land" : "a house"),
    criteria.locations.length && criteria.locations.map(locName).join(", "),
    criteria.bedrooms && `${criteria.bedrooms} bedrooms`,
    criteria.builtUp && `~${criteria.builtUp.toLocaleString("en-IN")} sq ft`,
    criteria.facilities.length && `near ${criteria.facilities.map((f) => FACILITY_KINDS[f as keyof typeof FACILITY_KINDS]?.toLowerCase() ?? f).join(", ")}`,
  ].filter(Boolean);

  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: "PlotFit", href: "/plotfit" }, { label: "Your matches" }]} />
      <header className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="annot text-emerald">PlotFit results</p>
          <h1 className="mt-3 text-headline text-navy">{result.matches.length ? `${result.matches.length} ${result.matches.length === 1 ? "property fits" : "properties fit"} what you told us.` : "Nothing fits every requirement yet."}</h1>
          <p className="mt-3 text-slate">{summary.length ? `Looking for ${summary.join(" · ")}.` : "You haven't set any preferences, so everything available is shown."}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
          <Link href={`/plotfit?${q}`} className="btn btn-outline text-navy">Refine My Matches</Link>
          <Link href="/site-visit" className="btn btn-gold">Arrange a Site Visit</Link>
        </div>
      </header>

      {hl && (
        <section className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4" aria-label="Highlights">
          {([["Best overall match", hl.overall], ["Best budget fit", hl.budget], ["Best location fit", hl.location], ["Best fit for your house", hl.house]] as const).map(([label, m]) => (
            <Link key={label} href={`/twin/${m.property.slug}`} className="bg-white p-5 hover:bg-paper">
              <p className="annot-plain text-gold-deep">{label}</p>
              <p className="mt-2 font-serif text-xl leading-tight text-navy">{m.property.title}</p>
              <p className="mt-1 text-xs text-slate">{m.property.referenceCode} · {m.score}% fit</p>
            </Link>
          ))}
        </section>
      )}

      <section className="mt-10 border border-navy bg-navy p-5 text-ivory">
        <SaveSearch criteria={criteria} signedIn={user?.role === "CUSTOMER"} consent={consent} next={`/plotfit/results?${q}`} />
      </section>

      <CompareSelect>
        {result.matches.length > 0 && (
          <section className="mt-10" aria-labelledby="m-h">
            <h2 id="m-h" className="annot text-emerald">All matches, best first</h2>
            <ol className="mt-4 space-y-4">
              {result.matches.map((m, i) => <MatchCard key={m.property.id} m={m} rank={i + 1} sample={sample.has(m.property.id)} />)}
            </ol>
          </section>
        )}
        {result.needsInfo.length > 0 && (
          <section className="mt-12" aria-labelledby="ni-h">
            <h2 id="ni-h" className="annot text-gold-deep">Needs more information before we can assess it</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate">These might suit you, but key facts aren't on record yet. Ask us and we'll fill the gaps.</p>
            <ol className="mt-4 space-y-4">
              {result.needsInfo.map((m) => <MatchCard key={m.property.id} m={m} sample={sample.has(m.property.id)} />)}
            </ol>
          </section>
        )}
      </CompareSelect>

      {result.excluded.length > 0 && (
        <details className="mt-12 border border-line bg-white p-5">
          <summary className="cursor-pointer font-semibold">{result.excluded.length} properties didn't meet an essential requirement</summary>
          <ul className="mt-3 space-y-1 text-sm text-slate">
            {result.excluded.map((e) => <li key={e.property.id}>{e.property.referenceCode} · {e.property.title} — {e.reason}</li>)}
          </ul>
          {!criteria.includeUnavailable && <Link href={`/plotfit/results?${q}${q ? "&" : ""}includeUnavailable=1`} className="mt-3 inline-block text-sm underline">Include sold and unavailable properties</Link>}
        </details>
      )}

      <p className="mt-10 max-w-3xl text-xs text-slate">
        Ranking uses only your answers and the property records: budget fit, location, size, how well your intended home fits, recorded infrastructure and how complete the record is. A match isn't a guarantee — and whether a house can legally be built depends on a site and regulatory review.
      </p>
    </div>
  );
}

function MatchCard({ m, rank, sample }: { m: Match; rank?: number; sample: boolean }) {
  const p = m.property;
  return (
    <li className="grid gap-5 border border-line bg-white p-5 md:grid-cols-[auto_1fr_auto]">
      <div className="flex items-start gap-4">
        {rank && <span className="font-mono text-sm text-gold-deep">{String(rank).padStart(2, "0")}</span>}
        <div className="relative h-16 w-16 shrink-0 rounded-full" style={{ background: `conic-gradient(#2C7A1E ${m.score * 3.6}deg, #E3DCCB 0)` }} role="img" aria-label={`${m.score}% fit`}>
          <span className="absolute inset-1.5 flex items-center justify-center rounded-full bg-white font-serif text-lg text-navy">{m.score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/twin/${p.slug}`} className="font-serif text-2xl text-navy hover:text-emerald">{p.title}</Link>
          {sample && <SampleTag />}
        </div>
        <p className="mt-1 text-sm text-slate">{p.referenceCode} · {p.kind === "land" ? "Land" : "House"} · {p.locationName ?? "—"} · {p.price !== null ? formatPrice(p.price) : "Price on request"}{p.availability === "RESERVED" ? " · Reserved" : p.availability !== "AVAILABLE" ? ` · ${p.availability.toLowerCase()}` : ""}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {m.reasons.map((r) => <li key={r} className="text-emerald">✓ <span className="text-ink">{r}</span></li>)}
          {m.compromises.map((r) => <li key={r} className="text-gold-deep">! <span className="text-ink">{r}</span></li>)}
          {m.unknowns.map((r) => <li key={r} className="text-slate">? {r}</li>)}
        </ul>
      </div>
      <div className="flex flex-row flex-wrap gap-2 md:flex-col md:items-stretch">
        <Link href={`/twin/${p.slug}`} className="btn btn-primary min-h-10 text-sm">Property Twin</Link>
        {p.kind === "land" && p.plotWidthFt && <Link href={`/studio/${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy">Property Studio</Link>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="compare" value={p.slug} className="h-4 w-4 accent-emerald" /> Compare</label>
      </div>
    </li>
  );
}
