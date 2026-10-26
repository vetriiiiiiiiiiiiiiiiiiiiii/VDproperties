import { Panel } from "@/components/admin/kit";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { CostCardForm } from "@/components/admin/PlatformForms";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Studio rate cards" };

export default async function Costs() {
  await requirePage("costs:manage");
  const [cards, locations] = await Promise.all([
    db.costAssumption.findMany({ orderBy: [{ active: "desc" }, { finish: "asc" }, { effectiveDate: "desc" }] }),
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const blank = { name: "", finish: "STANDARD", locationId: "", constructionPerSqft: "", foundationPerSqft: "", sitePreparation: "", utilitiesConnection: "", registrationPct: "", landscapingPerSqft: "", parkingPerSlot: "", contingencyPct: "", source: "", effectiveDate: new Date().toISOString().slice(0, 10), notes: "", isDemo: false, active: true };
  return (
    <>
      <PageHeader title="Studio rate cards" description="Cost assumptions behind every Property Studio estimate. The newest active card for a finish level (location-specific first) is used." />
      {cards.some((c) => c.isDemo && c.active) && <Notice tone="warn">Demonstration rate cards are active. Customers see them labelled “not market data”. Replace them with verified rates before launch.</Notice>}
      <div className="space-y-6">
        <Panel title="Add a rate card"><CostCardForm id={null} v={blank} locations={locations} /></Panel>
        {cards.map((c) => (
          <Panel key={c.id} title={`${c.name}${c.active ? "" : " (inactive)"}`} description={`${c.finish.toLowerCase()} · ${c.source}`}>
            <CostCardForm
              id={c.id}
              locations={locations}
              v={{
                name: c.name, finish: c.finish, locationId: c.locationId ?? "", constructionPerSqft: String(c.constructionPerSqft), foundationPerSqft: String(c.foundationPerSqft), sitePreparation: String(c.sitePreparation),
                utilitiesConnection: String(c.utilitiesConnection), registrationPct: String(c.registrationPct), landscapingPerSqft: String(c.landscapingPerSqft), parkingPerSlot: String(c.parkingPerSlot),
                contingencyPct: String(c.contingencyPct), source: c.source, effectiveDate: c.effectiveDate.toISOString().slice(0, 10), notes: c.notes ?? "", isDemo: c.isDemo, active: c.active,
              }}
            />
          </Panel>
        ))}
      </div>
    </>
  );
}
