import { deleteAmenity, deleteLocation } from "@/app/admin/_actions/catalogue";
import { AmenityForm, LocationForm } from "@/components/admin/CatalogueForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Locations & amenities" };

export default async function Catalogue() {
  await requirePage("catalogue:manage");
  const [locations, amenities] = await Promise.all([
    db.location.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { properties: true } } } }),
    db.amenity.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { properties: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Locations & amenities" description="Used for listings, search filters and the About page's service area. Only add real localities you work in and amenities you can verify." />
      <div className="space-y-6">
        <Panel title="Add a location"><LocationForm id={null} /></Panel>
        <Panel title={`Locations (${locations.length})`}>
          <ul className="divide-y divide-line">
            {locations.map((l) => (
              <li key={l.id} className="py-4">
                <LocationForm id={l.id} values={{ name: l.name, city: l.city ?? "", district: l.district ?? "", state: l.state ?? "", isServiceArea: l.isServiceArea }} />
                <div className="mt-2 flex items-center gap-4 text-xs text-slate">
                  <span>{l._count.properties} listing(s)</span>
                  {l._count.properties === 0 && (
                    <form action={deleteLocation.bind(null, l.id)}>
                      <ConfirmButton message={`Delete ${l.name}?`} className="text-terracotta-deep underline">Delete</ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
            {locations.length === 0 && <li className="py-4 text-sm text-slate">No locations yet.</li>}
          </ul>
        </Panel>
        <Panel title={`Amenities (${amenities.length})`}>
          <AmenityForm />
          <ul className="mt-6 flex flex-wrap gap-2">
            {amenities.map((a) => (
              <li key={a.id} className="flex items-center gap-2 border border-line px-3 py-1.5 text-sm">
                {a.name} <span className="text-xs text-slate">({a._count.properties})</span>
                <form action={deleteAmenity.bind(null, a.id)}>
                  <ConfirmButton message={`Delete “${a.name}”? It will be removed from ${a._count.properties} listing(s).`} className="text-terracotta-deep" >
                    <span aria-hidden="true">×</span><span className="sr-only">Delete {a.name}</span>
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
