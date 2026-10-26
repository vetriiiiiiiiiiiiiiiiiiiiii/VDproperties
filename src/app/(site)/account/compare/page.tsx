import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";
import { Breadcrumbs } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { scenarioNote, scenarioStatus, type ScenarioInputs, type ScenarioResult } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.compare.meta, robots: { index: false } };
}

export default async function CompareScenarios({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const me = await requireCustomerPage("/account/compare");
  const { t, f, href } = await getI18n();
  const c = t.account.compare;
  const R = c.rows;
  const warn = (w: ScenarioResult["warnings"][number]) => w.text ?? (w.code ? t.studio.warnings[w.code as keyof typeof t.studio.warnings]?.(w.params ?? {}) : "");
  const all = await db.planningScenario.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    include: { property: { select: { slug: true, updatedAt: true, availability: true, publication: true, title: true } } },
  });
  const ids = (await searchParams).ids?.split(",") ?? [];
  const picked = (ids.length ? all.filter((s) => ids.includes(s.id)) : all).slice(0, 4);

  const rows: [string, (s: (typeof all)[number]) => React.ReactNode][] = [
    [R.plot, (s) => { const p = s.plotSnapshot as { illustrative?: boolean; referenceCode?: string; widthFt?: number; depthFt?: number }; return p.illustrative ? c.plotIll(p.widthFt ?? 0, p.depthFt ?? 0) : c.plotRef(p.referenceCode ?? "", p.widthFt ?? 0, p.depthFt ?? 0); }],
    [R.plotArea, (s) => f.area((s.result as ScenarioResult).plotAreaSqft)],
    [R.house, (s) => { const i = s.inputs as ScenarioInputs; return c.house(i.bedrooms, i.floors, f.area(i.builtUpSqft)); }],
    [R.fits, (s) => f.area((s.result as ScenarioResult).achievedBuiltUpSqft)],
    [R.feasibility, (s) => ((s.result as ScenarioResult).feasible ? <span className="text-emerald">{c.fitsYes}</span> : <span className="text-terracotta-deep">{c.fitsNo}</span>)],
    [R.constraints, (s) => (s.result as ScenarioResult).warnings.filter((w) => w.level !== "info").map(warn).join(" ") || c.noneFlagged],
    [R.total, (s) => <strong>{f.price((s.result as ScenarioResult).estimate.total)}</strong>],
    [R.missing, (s) => (s.result as ScenarioResult).estimate.missing.map((k) => (t.studio.lines as Record<string, string>)[k] ?? k).join(", ") || "—"],
    [R.status, (s) => scenarioNote(scenarioStatus(s), t.account.scenario, (a) => t.labels.availability[a])],
  ];

  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: t.account.dash.eyebrow, href: "/account" }, { label: c.title }]} />
      <h1 className="mt-6 text-headline text-navy">{c.title}</h1>
      {all.length === 0 ? (
        <p className="mt-6 text-slate">{c.none} <Link href="/studio" className="underline">{c.open}</Link>.</p>
      ) : (
        <>
          <form className="mt-6 flex flex-wrap items-end gap-3" action={href("/account/compare")}>
            <fieldset className="flex flex-wrap gap-3">
              <legend className="field-label">{c.chooseUp}</legend>
              {all.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm">
                  <input type="checkbox" name="id" value={s.id} defaultChecked={picked.some((p) => p.id === s.id)} className="accent-emerald" /> {s.name}
                </label>
              ))}
            </fieldset>
            <button formAction={href("/account/compare/apply")} className="btn btn-primary min-h-11">{c.compare}</button>
          </form>
          <div className="surface mt-8 overflow-x-auto">
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
