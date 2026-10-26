import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { CompareSelect } from "@/components/plotfit/CompareSelect";
import { SaveSearch } from "@/components/plotfit/SaveSearch";
import { Breadcrumbs, SampleTag } from "@/components/site/ui";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { matchInclude, toMatchProperty } from "@/lib/platform";
import { criteriaToQuery, highlights, matchProperties, normaliseWeights, parseCriteria, type Match, type Msg } from "@/lib/plotfit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.plotfit.results.meta, robots: { index: false, follow: true } };
}

type I18n = Awaited<ReturnType<typeof getI18n>>;

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const i18n = await getI18n();
  const { t, f } = i18n;
  const r = t.plotfit.results;
  const criteria = parseCriteria(await searchParams);
  const [rows, settings, user, locations] = await Promise.all([
    // Unavailable listings are excluded by the matcher (with a reason) unless the visitor asks to include them.
    db.property.findMany({ where: { publication: "PUBLISHED" }, include: matchInclude }),
    getSettings(),
    getCurrentUser(),
    db.location.findMany({ select: { slug: true, name: true } }),
  ]);
  const sample = new Set(rows.filter((row) => row.isSample).map((row) => row.id));
  const result = matchProperties(rows.map(toMatchProperty), criteria, normaliseWeights(settings.plotfitWeights));
  // With only one or two matches every lens picks the same property, so highlights add nothing.
  const hl = result.matches.length >= 3 ? highlights(result.matches) : null;
  const q = criteriaToQuery(criteria);
  const consent = user?.role === "CUSTOMER" ? (await db.user.findUnique({ where: { id: user.id }, select: { marketingConsent: true } }))?.marketingConsent ?? false : false;
  const locName = (s: string) => locations.find((l) => l.slug === s)?.name ?? s;
  const facility = (k: string) => t.twin.facilities[k] ?? k;

  const summary = [
    criteria.budget && r.summary.budget(f.price(criteria.budget), criteria.reservePct),
    criteria.type !== "either" && (criteria.type === "land" ? r.summary.land : r.summary.home),
    criteria.locations.length && criteria.locations.map(locName).join(", "),
    criteria.bedrooms && r.summary.beds(criteria.bedrooms),
    criteria.builtUp && r.summary.size(f.number(criteria.builtUp)),
    criteria.facilities.length && r.summary.near(criteria.facilities.map((k) => facility(k).toLocaleLowerCase()).join(", ")),
  ].filter(Boolean);
  const msg = t.plotfit.msg(f, facility);
  const say = (m: Msg) => msg[m.code](m.params ?? {});

  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: "PlotFit", href: "/plotfit" }, { label: r.crumb }]} />
      <header className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="annot text-emerald">{r.eyebrow}</p>
          <h1 className="mt-3 text-headline text-navy">{r.title(result.matches.length)}</h1>
          <p className="mt-3 text-slate">{summary.length ? r.lookingFor(summary.join(" · ")) : r.noPrefs}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
          <Link href={`/plotfit?${q}`} className="btn btn-outline text-navy">{r.refine}</Link>
          <Link href="/site-visit" className="btn btn-gold">{r.visit}</Link>
        </div>
      </header>

      {hl && (
        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={r.highlights}>
          {([[r.best.overall, hl.overall], [r.best.budget, hl.budget], [r.best.location, hl.location], [r.best.house, hl.house]] as const).map(([label, m]) => (
            <Link key={label} href={`/twin/${m.property.slug}`} className="surface group p-5 transition-transform duration-500 hover:-translate-y-1">
              <p className="annot-plain text-gold-deep">{label}</p>
              <p className="mt-2 font-serif text-xl leading-tight text-navy group-hover:text-emerald">{m.property.title}</p>
              <p className="mt-1 text-xs text-slate">{m.property.referenceCode} · {r.fit(m.score)}</p>
            </Link>
          ))}
        </section>
      )}

      <section className="glass-dark mt-10 rounded-[1rem] p-5 text-ivory">
        <SaveSearch criteria={criteria} signedIn={user?.role === "CUSTOMER"} consent={consent} next={`/plotfit/results?${q}`} />
      </section>

      <CompareSelect>
        {result.matches.length > 0 && (
          <section className="mt-10" aria-labelledby="m-h">
            <h2 id="m-h" className="annot text-emerald">{r.all}</h2>
            <ol className="mt-4 space-y-4">
              {result.matches.map((m, i) => <MatchCard key={m.property.id} m={m} rank={i + 1} sample={sample.has(m.property.id)} i18n={i18n} say={say} />)}
            </ol>
          </section>
        )}
        {result.needsInfo.length > 0 && (
          <section className="mt-12" aria-labelledby="ni-h">
            <h2 id="ni-h" className="annot text-gold-deep">{r.needsInfo}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate">{r.needsInfoBody}</p>
            <ol className="mt-4 space-y-4">
              {result.needsInfo.map((m) => <MatchCard key={m.property.id} m={m} sample={sample.has(m.property.id)} i18n={i18n} say={say} />)}
            </ol>
          </section>
        )}
      </CompareSelect>

      {result.excluded.length > 0 && (
        <details className="surface mt-12 p-5">
          <summary className="cursor-pointer font-semibold">{r.excluded(result.excluded.length)}</summary>
          <ul className="mt-3 space-y-1 text-sm text-slate">
            {result.excluded.map((e) => <li key={e.property.id}>{e.property.referenceCode} · {e.property.title} — {say(e.reason)}</li>)}
          </ul>
          {!criteria.includeUnavailable && <Link href={`/plotfit/results?${q}${q ? "&" : ""}includeUnavailable=1`} className="mt-3 inline-block text-sm underline">{r.includeUnavailable}</Link>}
        </details>
      )}

      <p className="mt-10 max-w-3xl text-xs text-slate">{r.footnote}</p>
    </div>
  );
}

function MatchCard({ m, rank, sample, i18n, say }: { m: Match; rank?: number; sample: boolean; i18n: I18n; say: (m: Msg) => string }) {
  const { t, f } = i18n;
  const r = t.plotfit.results;
  const p = m.property;
  return (
    <li className="surface grid gap-5 p-5 md:grid-cols-[auto_1fr_auto]">
      <div className="flex items-start gap-4">
        {rank && <span className="font-mono text-sm text-gold-deep">{String(rank).padStart(2, "0")}</span>}
        <div className="score-ring relative h-16 w-16 shrink-0 rounded-full" style={{ "--score": `${m.score * 3.6}deg` } as React.CSSProperties} role="img" aria-label={r.fit(m.score)}>
          <span className="absolute inset-1.5 flex items-center justify-center rounded-full bg-white font-serif text-lg text-navy">{m.score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/twin/${p.slug}`} className="font-serif text-2xl text-navy hover:text-emerald">{p.title}</Link>
          {sample && <SampleTag />}
        </div>
        <p className="mt-1 text-sm text-slate">
          {p.referenceCode} · {p.kind === "land" ? r.land : r.house} · {p.locationName ?? "—"} · {p.price !== null ? f.price(p.price) : t.price.priceOnRequest}
          {p.availability !== "AVAILABLE" && ` · ${t.labels.availability[p.availability]}`}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {m.reasons.map((x, i) => <li key={`r${i}`} className="text-emerald">✓ <span className="text-ink">{say(x)}</span></li>)}
          {m.compromises.map((x, i) => <li key={`c${i}`} className="text-gold-deep">! <span className="text-ink">{say(x)}</span></li>)}
          {m.unknowns.map((x, i) => <li key={`u${i}`} className="text-slate">? {say(x)}</li>)}
        </ul>
      </div>
      <div className="flex flex-row flex-wrap gap-2 md:flex-col md:items-stretch">
        <Link href={`/twin/${p.slug}`} className="btn btn-primary min-h-10 text-sm">{r.twin}</Link>
        {p.kind === "land" && p.plotWidthFt && <Link href={`/studio/${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy">{r.studio}</Link>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="compare" value={p.slug} className="h-4 w-4 accent-emerald" /> {r.compare}</label>
      </div>
    </li>
  );
}
