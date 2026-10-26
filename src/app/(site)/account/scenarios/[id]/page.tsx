import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { scenarioNote, scenarioStatus, studioHref, type ScenarioInputs, type ScenarioResult } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.scenario.meta, robots: { index: false } };
}

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireCustomerPage("/account");
  const { t, f } = await getI18n();
  const x = t.account.scenario;
  const F = x.facts;
  const yes = (b: boolean) => (b ? x.yes : x.no);
  const pl = t.studio.planner;
  const s = await db.planningScenario.findFirst({
    where: { id: (await params).id, userId: me.id },
    include: { property: { select: { slug: true, updatedAt: true, availability: true, publication: true, title: true, referenceCode: true } } },
  });
  if (!s) notFound();
  const r = s.result as ScenarioResult;
  const i = s.inputs as ScenarioInputs;
  const snap = s.plotSnapshot as { widthFt?: number; depthFt?: number; title?: string; referenceCode?: string; illustrative?: boolean };
  const st = scenarioStatus(s);
  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: t.account.dash.eyebrow, href: "/account" }, { label: s.name }]} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="annot text-emerald">{x.eyebrow(f.date(s.updatedAt))}</p>
          <h1 className="mt-3 text-4xl text-navy">{s.name}</h1>
          <p className="mt-1 text-slate">{snap.illustrative ? x.illustrative(snap.widthFt ?? 0, snap.depthFt ?? 0) : x.property(snap.referenceCode ?? "", snap.title ?? "", snap.widthFt ?? 0, snap.depthFt ?? 0)}</p>
          <p className={`mt-2 text-sm ${st.kind === "current" || st.kind === "illustrative" ? "text-slate" : "text-terracotta-deep"}`}>{scenarioNote(st, x, (a) => t.labels.availability[a])}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link href={studioHref(s)} className="btn btn-primary">{x.reopen}</Link>
          <Link href={`/account/compare?ids=${s.id}`} className="btn btn-outline text-navy">{x.compare}</Link>
        </div>
      </header>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="annot text-emerald">{x.concept}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {([
              [F.bedrooms, i.bedrooms], [F.floors, i.floors], [F.requested, f.area(i.builtUpSqft)], [F.fits, f.area(r.achievedBuiltUpSqft)],
              [F.footprint, f.area(r.footprintSqft)], [F.coverage, `${r.coveragePct}%`], [F.style, pl.styles[i.style as keyof typeof pl.styles] ?? i.style], [F.finish, pl.finishes[i.finish as keyof typeof pl.finishes] ?? i.finish],
              [F.parking, i.parkingSlots], [F.garden, yes(i.garden)], [F.study, yes(i.study)], [F.feasible, yes(r.feasible)],
            ] as const).map(([k, v]) => <div key={k}><dt className="text-slate">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
          </dl>
          <ul className="mt-4 space-y-1 text-xs text-slate">{r.warnings.map((w, k) => <li key={k}>· {w.text ?? (w.code ? t.studio.warnings[w.code as keyof typeof t.studio.warnings]?.(w.params ?? {}) : "")}</li>)}</ul>
        </section>
        <section className="surface p-5">
          <h2 className="annot text-emerald">{x.budgetAtSave}</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {r.estimate.lines.map((l) => (
                <tr key={l.key}><td className="py-2">{(t.studio.lines as Record<string, string>)[l.key] ?? l.label}<span className="ml-2 text-xs text-slate">{pl.basis[l.basis as keyof typeof pl.basis]}</span></td><td className="py-2 text-right">{l.amount === null ? "—" : f.rupees(l.amount)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-navy"><td className="py-3 font-serif text-xl">{x.total}</td><td className="py-3 text-right font-serif text-xl">{f.rupees(r.estimate.total)}</td></tr></tfoot>
          </table>
          {r.card && <p className="mt-3 text-xs text-slate">{x.rates(r.card.name, r.card.source, r.card.effectiveDate, r.card.isDemo)}</p>}
          {!r.estimate.complete && <p className="mt-2 text-xs text-terracotta-deep">{x.incomplete(r.estimate.missing.map((k) => (t.studio.lines as Record<string, string>)[k] ?? k).join(", "))}</p>}
        </section>
      </div>
      <p className="mt-6 text-xs text-slate">{x.footnote}</p>
    </div>
  );
}
