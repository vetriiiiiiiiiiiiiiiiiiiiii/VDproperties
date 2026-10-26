import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { scenarioStatus, type ScenarioInputs, type ScenarioResult } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare scenarios", robots: { index: false } };

export default async function CompareScenarios({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const me = await requireCustomerPage("/account/compare");
  const all = await db.planningScenario.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    include: { property: { select: { slug: true, updatedAt: true, availability: true, publication: true, title: true } } },
  });
  const ids = (await searchParams).ids?.split(",") ?? [];
  const picked = (ids.length ? all.filter((s) => ids.includes(s.id)) : all).slice(0, 4);

  const rows: [string, (s: (typeof all)[number]) => React.ReactNode][] = [
    ["Plot", (s) => { const p = s.plotSnapshot as { illustrative?: boolean; referenceCode?: string; widthFt?: number; depthFt?: number }; return p.illustrative ? `Illustrative ${p.widthFt}×${p.depthFt} ft` : `${p.referenceCode} · ${p.widthFt}×${p.depthFt} ft`; }],
    ["Plot area", (s) => `${Math.round((s.result as ScenarioResult).plotAreaSqft).toLocaleString("en-IN")} sq ft`],
    ["Proposed house", (s) => { const i = s.inputs as ScenarioInputs; return `${i.bedrooms} bed · ${i.floors} floor · ${i.builtUpSqft.toLocaleString("en-IN")} sq ft requested`; }],
    ["Area that fits", (s) => `${(s.result as ScenarioResult).achievedBuiltUpSqft.toLocaleString("en-IN")} sq ft`],
    ["Layout feasibility", (s) => ((s.result as ScenarioResult).feasible ? <span className="text-emerald">Fits the limits used</span> : <span className="text-terracotta-deep">Doesn't fit</span>)],
    ["Known constraints", (s) => (s.result as ScenarioResult).warnings.filter((w) => w.level !== "info").map((w) => w.text).join(" ") || "None flagged"],
    ["Estimated total", (s) => <strong>{formatPrice((s.result as ScenarioResult).estimate.total)}</strong>],
    ["Missing information", (s) => (s.result as ScenarioResult).estimate.missing.join(", ") || "—"],
    ["Property status", (s) => scenarioStatus(s).note],
  ];

  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: "Your account", href: "/account" }, { label: "Compare scenarios" }]} />
      <h1 className="mt-6 text-headline text-navy">Compare scenarios</h1>
      {all.length === 0 ? (
        <p className="mt-6 text-slate">No saved scenarios yet. <Link href="/studio" className="underline">Open Property Studio</Link>.</p>
      ) : (
        <>
          <form className="mt-6 flex flex-wrap items-end gap-3" action="/account/compare">
            <fieldset className="flex flex-wrap gap-3">
              <legend className="field-label">Choose up to four</legend>
              {all.map((s) => (
                <label key={s.id} className="flex items-center gap-2 border border-line bg-white px-3 py-2 text-sm">
                  <input type="checkbox" name="id" value={s.id} defaultChecked={picked.some((p) => p.id === s.id)} className="accent-emerald" /> {s.name}
                </label>
              ))}
            </fieldset>
            <button formAction="/account/compare/apply" className="btn btn-primary min-h-11">Compare</button>
          </form>
          <div className="mt-8 overflow-x-auto border border-line bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead><tr><th className="w-44 p-4" />{picked.map((s) => <th key={s.id} scope="col" className="border-l border-line p-4 font-serif text-lg font-normal text-navy"><Link href={`/account/scenarios/${s.id}`} className="hover:underline">{s.name}</Link></th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map(([label, fn]) => (
                  <tr key={label}><th scope="row" className="p-4 font-medium text-slate">{label}</th>{picked.map((s) => <td key={s.id} className="border-l border-line p-4">{fn(s)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
