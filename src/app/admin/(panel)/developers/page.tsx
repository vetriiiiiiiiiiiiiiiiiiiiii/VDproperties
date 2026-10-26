import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { DeveloperForm } from "@/components/admin/PlatformForms";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Developers" };

export default async function Developers() {
  await requirePage("developers:manage");
  const devs = await db.developer.findMany({ orderBy: { name: "asc" }, include: { properties: { select: { referenceCode: true, publication: true } } } });
  return (
    <>
      <PageHeader title="Developers" description="Partner developers and their listings. Listings from developers that aren't authorised can't be published." />
      <div className="space-y-6">
        <Panel title="Add a developer"><DeveloperForm id={null} v={{ name: "", contact: "", notes: "", authorised: true }} /></Panel>
        <Panel title={`Developers (${devs.length})`}>
          <ul className="divide-y divide-line">
            {devs.map((d) => (
              <li key={d.id} className="py-4">
                <DeveloperForm id={d.id} v={{ name: d.name, contact: d.contact ?? "", notes: d.notes ?? "", authorised: d.authorised }} />
                <p className="mt-1 text-xs text-slate">Listings: {d.properties.map((p) => `${p.referenceCode}${p.publication === "PUBLISHED" ? "" : " (draft)"}`).join(", ") || "none"} — assign in each property's Twin data.</p>
              </li>
            ))}
            {devs.length === 0 && <li className="py-4 text-sm text-slate">No developers yet.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
