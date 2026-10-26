import { deleteZone } from "@/app/admin/_actions/zones";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { ZoneForm } from "@/components/admin/ZoneForm";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Zones" };

export default async function Zones() {
  await requirePage("zones:manage");
  const [zones, locations] = await Promise.all([
    db.zone.findMany({
      orderBy: { name: "asc" },
      include: {
        officers: { where: { active: true }, select: { name: true } },
        locations: { select: { id: true, _count: { select: { properties: { where: { publication: "PUBLISHED" } } } } } },
      },
    }),
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true, zoneId: true, zone: { select: { name: true } } } }),
  ]);
  const locs = locations.map((l) => ({ id: l.id, name: l.name, city: l.city, zoneId: l.zoneId, zoneName: l.zone?.name ?? null }));
  const unzoned = locations.filter((l) => !l.zoneId);
  return (
    <>
      <PageHeader
        title="Zones"
        description="A zone groups locations. Zonal officers see and work on properties, owner submissions, enquiries, site visits and purchase requests only for locations in their zones. Assign officers to zones under Team & roles."
      />
      <div className="space-y-6">
        {unzoned.length > 0 && zones.length > 0 && (
          <p className="border-l-4 border-gold bg-white p-4 text-sm">
            {unzoned.length} location{unzoned.length > 1 ? "s aren't" : " isn't"} in any zone ({unzoned.map((l) => l.name).join(", ")}). Their leads are handled by the office team only.
          </p>
        )}
        <Panel title="New zone"><ZoneForm locations={locs} /></Panel>
        {zones.map((z) => (
          <Panel
            key={z.id}
            title={z.name}
            description={`${z.locations.length} location(s) · ${z.locations.reduce((s, l) => s + l._count.properties, 0)} live listing(s) · officers: ${z.officers.map((o) => o.name).join(", ") || "none assigned"}`}
            actions={
              <form action={deleteZone.bind(null, z.id)}>
                <ConfirmButton message={`Delete ${z.name}? Its locations stay; they just won't belong to a zone.`} className="text-sm text-terracotta-deep underline">Delete</ConfirmButton>
              </form>
            }
          >
            <ZoneForm zone={{ id: z.id, name: z.name, description: z.description }} locations={locs} />
          </Panel>
        ))}
      </div>
    </>
  );
}
