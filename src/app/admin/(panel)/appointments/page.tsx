import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { APPOINTMENT_MODE_LABEL } from "@/lib/labels";
import { purchaseScope, siteVisitScope } from "@/lib/zones";

export const metadata = { title: "Appointments" };

type Item = { id: string; href: string; when: Date; confirmed: boolean; kind: string; who: string; phone: string; about: string; assigned: string | null };

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const time = (d: Date) => d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });

/** One list of upcoming site visits and purchase appointments, confirmed or still requested, by day. */
export default async function Appointments() {
  const user = await requirePage("leads:manage");
  const from = new Date(Date.now() - 6 * 3600_000);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const [visits, purchases] = await Promise.all([
    db.siteVisit.findMany({
      where: { AND: [await siteVisitScope(user)], status: { in: ["NEW", "CONTACTED", "SCHEDULED"] }, OR: [{ scheduledFor: { gte: from } }, { scheduledFor: null, preferredDate: { gte: today } }] },
      include: { assignedTo: { select: { name: true } } },
      take: 300,
    }),
    db.purchaseRequest.findMany({
      where: { AND: [await purchaseScope(user)], status: { in: ["NEW", "CONTACTED", "APPOINTMENT_SCHEDULED", "NEGOTIATING"] }, OR: [{ scheduledFor: { gte: from } }, { scheduledFor: null, preferredDate: { gte: today } }] },
      include: { assignedTo: { select: { name: true } } },
      take: 300,
    }),
  ]);
  const items: Item[] = [
    ...visits.map((v) => ({ id: v.id, href: `/admin/site-visits/${v.id}`, when: v.scheduledFor ?? v.preferredDate, confirmed: !!v.scheduledFor, kind: "Site visit", who: v.name, phone: v.phone, about: v.subjectLabel, assigned: v.assignedTo?.name ?? null })),
    ...purchases.map((p) => ({ id: p.id, href: `/admin/purchases/${p.id}`, when: p.scheduledFor ?? p.preferredDate, confirmed: !!p.scheduledFor, kind: `Buyer · ${APPOINTMENT_MODE_LABEL[p.mode]}`, who: p.name, phone: p.phone, about: p.propertyLabel, assigned: p.assignedTo?.name ?? null })),
  ].sort((a, b) => a.when.getTime() - b.when.getTime());
  const days = new Map<string, Item[]>();
  for (const it of items) days.set(dayKey(it.when), [...(days.get(dayKey(it.when)) ?? []), it]);

  return (
    <>
      <PageHeader title="Appointments" description="Upcoming site visits and buyer appointments. Requested ones aren't booked until someone confirms a time with the customer." />
      {items.length === 0 && <p className="border border-line bg-white p-8 text-slate">No upcoming appointments.</p>}
      <div className="space-y-6">
        {[...days.entries()].map(([day, list]) => (
          <section key={day} className="border border-line bg-white">
            <h2 className="border-b border-line bg-paper px-4 py-2.5 text-sm font-semibold">{formatDate(new Date(`${day}T00:00:00Z`), { dateStyle: "full", timeZone: "UTC" })}</h2>
            <ul className="divide-y divide-line">
              {list.map((it) => (
                <li key={it.href} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[7rem_10rem_1fr_9rem] sm:items-center">
                  <span className={it.confirmed ? "font-semibold text-emerald" : "text-gold-deep"}>{it.confirmed ? time(it.when) : "Requested"}</span>
                  <span className="text-slate">{it.kind}</span>
                  <span><Link href={it.href} className="font-medium text-navy hover:underline">{it.who}</Link> · {it.phone}<span className="block truncate text-xs text-slate">{it.about}</span></span>
                  <span className="text-xs text-slate">{it.assigned ?? "Unassigned"}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
