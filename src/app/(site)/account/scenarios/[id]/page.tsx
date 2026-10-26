import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRupeesFull } from "@/lib/format";
import { scenarioStatus, studioHref, type ScenarioInputs, type ScenarioResult } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved scenario", robots: { index: false } };

const BASIS: Record<string, string> = { QUOTED: "Quoted", ESTIMATED: "Estimated", USER: "Your figure", MISSING: "Missing" };

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireCustomerPage("/account");
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
      <Breadcrumbs items={[{ label: "Your account", href: "/account" }, { label: s.name }]} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="annot text-emerald">Saved scenario · {formatDate(s.updatedAt)}</p>
          <h1 className="mt-3 text-4xl text-navy">{s.name}</h1>
          <p className="mt-1 text-slate">{snap.illustrative ? `Illustrative ${snap.widthFt} × ${snap.depthFt} ft plot` : `${snap.referenceCode} · ${snap.title} (${snap.widthFt} × ${snap.depthFt} ft when saved)`}</p>
          <p className={`mt-2 text-sm ${st.kind === "current" || st.kind === "illustrative" ? "text-slate" : "text-terracotta-deep"}`}>{st.note}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link href={studioHref(s)} className="btn btn-primary">Reopen in Studio</Link>
          <Link href={`/account/compare?ids=${s.id}`} className="btn btn-outline text-navy">Compare</Link>
        </div>
      </header>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="border border-line bg-white p-5">
          <h2 className="annot text-emerald">House concept</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {([
              ["Bedrooms", i.bedrooms], ["Floors", i.floors], ["Requested area", `${i.builtUpSqft.toLocaleString("en-IN")} sq ft`], ["Area that fits", `${r.achievedBuiltUpSqft.toLocaleString("en-IN")} sq ft`],
              ["Footprint", `${r.footprintSqft.toLocaleString("en-IN")} sq ft`], ["Coverage", `${r.coveragePct}%`], ["Style", i.style.toLowerCase()], ["Finish", i.finish.toLowerCase()],
              ["Parking", i.parkingSlots], ["Garden", i.garden ? "Yes" : "No"], ["Study", i.study ? "Yes" : "No"], ["Fits plot limits", r.feasible ? "Yes" : "No"],
            ] as const).map(([k, v]) => <div key={k}><dt className="text-slate">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
          </dl>
          <ul className="mt-4 space-y-1 text-xs text-slate">{r.warnings.map((w, k) => <li key={k}>· {w.text}</li>)}</ul>
        </section>
        <section className="border border-line bg-white p-5">
          <h2 className="annot text-emerald">Budget at the time of saving</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {r.estimate.lines.map((l) => (
                <tr key={l.key}><td className="py-2">{l.label}<span className="ml-2 text-xs text-slate">{BASIS[l.basis]}</span></td><td className="py-2 text-right">{l.amount === null ? "—" : formatRupeesFull(l.amount)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-navy"><td className="py-3 font-serif text-xl">Total</td><td className="py-3 text-right font-serif text-xl">{formatRupeesFull(r.estimate.total)}</td></tr></tfoot>
          </table>
          {r.card && <p className="mt-3 text-xs text-slate">Rates: {r.card.name} · {r.card.source} · effective {r.card.effectiveDate}{r.card.isDemo && " · demonstration rates, not market data"}</p>}
          {!r.estimate.complete && <p className="mt-2 text-xs text-terracotta-deep">Incomplete: {r.estimate.missing.join(", ")}</p>}
        </section>
      </div>
      <p className="mt-6 text-xs text-slate">A saved concept and estimate, not an architectural drawing or quotation.</p>
    </div>
  );
}
