import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };
const PER = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ page?: string; entity?: string }> }) {
  await requirePage("audit:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.entity ? { entityType: sp.entity } : {};
  const [total, events] = await Promise.all([
    db.auditEvent.count({ where }),
    db.auditEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true } } } }),
  ]);
  const entities = ["Property", "Project", "Enquiry", "SiteVisit", "User", "SiteSettings", "Location", "Amenity"];
  return (
    <>
      <PageHeader title="Audit log" description="Important administrative actions, newest first." />
      <nav aria-label="Filter by type" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/audit" className={`border px-3 py-1 ${!sp.entity ? "border-forest bg-forest text-ivory" : "border-line"}`}>All</Link>
        {entities.map((e) => <Link key={e} href={`/admin/audit?entity=${e}`} className={`border px-3 py-1 ${sp.entity === e ? "border-forest bg-forest text-ivory" : "border-line"}`}>{e}</Link>)}
      </nav>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">When</th><th scope="col" className="px-4 py-3">Who</th><th scope="col" className="px-4 py-3">Action</th><th scope="col" className="px-4 py-3">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-2.5">{e.actor?.name ?? "System"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.action}</td>
                <td className="px-4 py-2.5">{e.summary}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate">Nothing recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="mt-4 flex gap-4 text-sm">
        {page > 1 && <Link href={`?page=${page - 1}${sp.entity ? `&entity=${sp.entity}` : ""}`} className="underline">Newer</Link>}
        {page * PER < total && <Link href={`?page=${page + 1}${sp.entity ? `&entity=${sp.entity}` : ""}`} className="underline">Older</Link>}
      </nav>
    </>
  );
}
