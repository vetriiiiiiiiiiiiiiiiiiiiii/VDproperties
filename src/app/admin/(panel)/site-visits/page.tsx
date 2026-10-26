import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { SITE_VISIT_STATUS_LABEL, TIME_SLOT_LABEL } from "@/lib/labels";

export const metadata = { title: "Site visits" };

export default async function SiteVisits({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; upcoming?: string }> }) {
  await requirePage("leads:manage");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const where: Prisma.SiteVisitWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { subjectLabel: { contains: q, mode: "insensitive" } }] }),
    ...(sp.status && sp.status in SITE_VISIT_STATUS_LABEL && { status: sp.status as "NEW" }),
    ...(sp.upcoming === "1" && { preferredDate: { gte: today }, status: { in: ["NEW", "CONTACTED", "SCHEDULED"] } }),
  };
  const items = await db.siteVisit.findMany({ where, orderBy: sp.upcoming === "1" ? { preferredDate: "asc" } : { createdAt: "desc" }, take: 200, include: { assignedTo: { select: { name: true } } } });
  return (
    <>
      <PageHeader
        title="Site visit requests"
        description="Requests aren't appointments until you confirm a time with the visitor and mark them Scheduled."
        actions={<a href="/api/admin/leads/export?kind=site-visits" className="btn btn-outline min-h-10 text-sm text-navy">Export CSV</a>}
      />
      <form className="mb-6 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Name, phone or property" aria-label="Search site visits" className="field" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field">
          <option value="">All statuses</option>
          {Object.entries(SITE_VISIT_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="upcoming" value="1" defaultChecked={sp.upcoming === "1"} className="accent-emerald" /> Upcoming only</label>
        <button className="btn btn-outline min-h-11 text-sm text-navy">Filter</button>
      </form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Requested date</th><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Property / project</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Confirmed for</th><th scope="col" className="px-4 py-3">Assigned</th><th scope="col" className="px-4 py-3">Received</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((v) => (
              <tr key={v.id} className={`hover:bg-ivory ${v.status === "NEW" ? "font-semibold" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3">{formatDate(v.preferredDate)}<span className="block text-xs font-normal text-slate">{TIME_SLOT_LABEL[v.timeSlot].split(" (")[0]}</span></td>
                <td className="px-4 py-3"><Link href={`/admin/site-visits/${v.id}`} className="text-navy hover:underline">{v.name}</Link></td>
                <td className="max-w-[16rem] truncate px-4 py-3">{v.subjectLabel}</td>
                <td className="px-4 py-3">{SITE_VISIT_STATUS_LABEL[v.status]}</td>
                <td className="whitespace-nowrap px-4 py-3">{v.scheduledFor ? formatDateTime(v.scheduledFor) : "—"}</td>
                <td className="px-4 py-3">{v.assignedTo?.name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate">{formatDateTime(v.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate">No site visit requests match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
